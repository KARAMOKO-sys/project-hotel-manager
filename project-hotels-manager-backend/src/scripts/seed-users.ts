import { ConflictException, INestApplicationContext } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UserType } from '../base-entities/enums/user-type.enum';
import { OwnersService } from '../owners/services/owners.service';
import { ReceptionistService } from '../receptionist/services/receptionist.service';
import { HousekeepingStaffService } from '../housekeeping-staff/services/housekeeping-staff.service';
import { AccountantService } from '../accountant/services/accountant.service';
import { GuestService } from '../guest/services/guest.service';
import { UserRoleService } from '../user-role/services/user-role.service';

/**
 * Comptes de démonstration, un par profil métier. Mots de passe connus,
 * réservés à un environnement de test : désactiver avec SEED_DEMO=false
 * en production.
 *
 * | Profil            | Type de compte | Rôle         |
 * |-------------------|----------------|--------------|
 * | Propriétaire      | owner          | owner        |
 * | Directeur d'hôtel | receptionist   | manager      |
 * | Réceptionniste    | receptionist   | receptionist |
 * | Gouvernante       | housekeeping   | housekeeping |
 * | Comptable         | accountant     | accountant   |
 * | Client            | guest          | guest        |
 *
 * Le personnel est rattaché à l'hôtel PS-ABJ par sa fiche (property_id).
 * Les rôles sont attribués sans restriction d'établissement (`scoped: false`) :
 * un rôle limité à un établissement ne s'applique qu'aux requêtes qui
 * portent ce `property_id` (pas à /auth/me, par exemple).
 */
export const DEMO_USERS: Array<{
  label: string;
  type: UserType;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  scoped: boolean;
  employee_code?: string;
}> = [
  {
    label: 'Propriétaire',
    type: UserType.OWNER,
    email: 'proprietaire@pleasantstay.local',
    password: 'Proprio@2026',
    first_name: 'Kouadio',
    last_name: 'Yao',
    role: 'owner',
    scoped: false,
  },
  {
    label: 'Directeur d’hôtel',
    type: UserType.RECEPTIONIST,
    email: 'directeur@pleasantstay.local',
    password: 'Directeur@2026',
    first_name: 'Aminata',
    last_name: 'Traoré',
    role: 'manager',
    scoped: false,
    employee_code: 'DIR-001',
  },
  {
    label: 'Réceptionniste',
    type: UserType.RECEPTIONIST,
    email: 'reception@pleasantstay.local',
    password: 'Reception@2026',
    first_name: 'Fatou',
    last_name: 'Diabaté',
    role: 'receptionist',
    scoped: false,
    employee_code: 'REC-001',
  },
  {
    label: 'Gouvernante',
    type: UserType.HOUSEKEEPING,
    email: 'gouvernance@pleasantstay.local',
    password: 'Menage@2026',
    first_name: 'Mariam',
    last_name: 'Ouattara',
    role: 'housekeeping',
    scoped: false,
    employee_code: 'HSK-001',
  },
  {
    label: 'Comptable',
    type: UserType.ACCOUNTANT,
    email: 'comptable@pleasantstay.local',
    password: 'Comptable@2026',
    first_name: 'Ibrahim',
    last_name: 'Bamba',
    role: 'accountant',
    scoped: false,
    employee_code: 'CPT-001',
  },
  {
    label: 'Client',
    type: UserType.GUEST,
    email: 'client@pleasantstay.local',
    password: 'Client@2026',
    first_name: 'Awa',
    last_name: 'Koné',
    role: 'guest',
    scoped: false,
  },
];

const COLLECTIONS: Record<string, string> = {
  [UserType.OWNER]: 'owners',
  [UserType.RECEPTIONIST]: 'receptionists',
  [UserType.HOUSEKEEPING]: 'housekeeping_staff',
  [UserType.ACCOUNTANT]: 'accountants',
  [UserType.GUEST]: 'guests',
};

export async function ensureDemoUsers(
  app: INestApplicationContext,
  demo: { propertyId: string },
  log: (message: string) => void,
): Promise<void> {
  const connection = app.get<Connection>(getConnectionToken());
  const roles = app.get(UserRoleService);
  let created = 0;

  for (const user of DEMO_USERS) {
    const collection = connection.collection(COLLECTIONS[user.type]);
    let existing = await collection.findOne({ email: user.email });
    if (!existing) {
      const base = {
        email: user.email,
        password: user.password,
        first_name: user.first_name,
        last_name: user.last_name,
      };
      const staff = {
        ...base,
        property_id: demo.propertyId,
        employee_code: user.employee_code,
      };
      switch (user.type) {
        case UserType.OWNER:
          await app.get(OwnersService).create(base as never);
          // Compte de démonstration : vérifié d'office.
          await collection.updateOne(
            { email: user.email },
            {
              $set: {
                owner_status: 'active',
                is_verified: true,
                is_email_verified: true,
              },
            },
          );
          break;
        case UserType.RECEPTIONIST:
          await app.get(ReceptionistService).create(staff as never);
          break;
        case UserType.HOUSEKEEPING:
          await app.get(HousekeepingStaffService).create(staff as never);
          break;
        case UserType.ACCOUNTANT:
          await app.get(AccountantService).create(staff as never);
          break;
        case UserType.GUEST:
          await app.get(GuestService).create(base as never);
          break;
      }
      await collection.updateOne(
        { email: user.email },
        { $set: { is_email_verified: true, is_active: true } },
      );
      existing = await collection.findOne({ email: user.email });
      created++;
    }

    const role = await connection
      .collection('roles')
      .findOne({ code: user.role });
    if (!existing || !role) continue;
    try {
      await roles.assignRole({
        user_id: String(existing._id),
        user_type: user.type,
        role_id: String(role._id),
        ...(user.scoped ? { property_id: demo.propertyId } : {}),
      } as never);
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
    }
  }
  log(
    `Utilisateurs de démonstration : ${created} créés (${DEMO_USERS.length} profils)`,
  );
}
