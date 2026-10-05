# Supprimer les migrations existantes
rm -rf src/database/migrations/*.ts
# Liste complète des services pour PleasantStay avec explications détaillées

## 1. Services d'authentification et gestion des utilisateurs

### AuthService - Gestion de l'authentification et de la sécurité

| Méthode | Fonction |
|---------|----------|
| `register(registerDto)` | Crée un nouveau compte utilisateur, hash le mot de passe, envoie un email de vérification |
| `login(loginDto)` | Authentifie un utilisateur, génère les tokens JWT (access + refresh), enregistre la dernière connexion |
| `logout(userId)` | Invalide le token de rafraîchissement, déconnecte l'utilisateur de toutes les sessions |
| `refreshToken(refreshTokenDto)` | Génère un nouveau token d'accès à partir d'un token de rafraîchissement valide |
| `verifyEmail(token)` | Valide l'email d'un utilisateur via le token envoyé par email, active le compte |
| `requestPasswordReset(email)` | Envoie un email avec un lien de réinitialisation de mot de passe sécurisé |
| `resetPassword(token, newPassword)` | Réinitialise le mot de passe après validation du token, hash le nouveau mot de passe |
| `changePassword(userId, oldPassword, newPassword)` | Permet à un utilisateur connecté de changer son mot de passe après vérification |
| `enableTwoFactor(userId)` | Active la double authentification, génère un secret et un QR code pour Google Authenticator |
| `disableTwoFactor(userId, code)` | Désactive la double authentification après vérification du code |
| `verifyTwoFactorCode(userId, code)` | Vérifie le code TOTP pour la double authentification |
| `validateUser(email, password)` | Vérifie les identifiants d'un utilisateur, gère les tentatives échouées et le verrouillage |
| `generateMagicLink(email)` | Génère un lien magique pour connexion sans mot de passe, valable 15 minutes |
| `loginWithMagicLink(token)` | Authentifie l'utilisateur via un lien magique, crée une session |

### UsersService - Gestion complète des utilisateurs

| Méthode | Fonction |
|---------|----------|
| `create(createUserDto)` | Crée un nouvel utilisateur avec tous ses attributs, hash le mot de passe |
| `findAll(filters, pagination)` | Liste tous les utilisateurs avec filtres (rôle, statut, date) et pagination |
| `findOne(id)` | Récupère un utilisateur par son UUID avec ses relations (rôles, propriétés) |
| `findByEmail(email)` | Recherche un utilisateur par son email (utilisé pour la connexion) |
| `update(id, updateUserDto)` | Met à jour les informations d'un utilisateur (profil, préférences) |
| `remove(id)` | Supprime logiquement un utilisateur (soft delete), le rend inactif |
| `restore(id)` | Restaure un utilisateur supprimé logiquement |
| `activate(id)` | Active un compte utilisateur désactivé |
| `deactivate(id)` | Désactive un compte utilisateur (suspendu, bloqué) |
| `assignRole(userId, roleId)` | Assigne un rôle à un utilisateur avec date d'expiration optionnelle |
| `removeRole(userId, roleId)` | Retire un rôle assigné à un utilisateur |
| `getPermissions(userId)` | Récupère toutes les permissions de l'utilisateur via ses rôles |
| `updateProfile(userId, profileData)` | Met à jour le profil public (nom, avatar, préférences) |
| `uploadAvatar(userId, file)` | Télécharge et traite l'image de profil, génère différentes tailles |
| `getActivityLogs(userId, pagination)` | Récupère l'historique des actions de l'utilisateur |

### RolesService - Gestion des rôles et permissions

| Méthode | Fonction |
|---------|----------|
| `create(createRoleDto)` | Crée un nouveau rôle (ex: manager, receptionist, housekeeping) |
| `findAll()` | Liste tous les rôles disponibles dans le système |
| `findOne(id)` | Récupère un rôle avec ses permissions associées |
| `update(id, updateRoleDto)` | Modifie un rôle (nom, description, niveau) |
| `delete(id)` | Supprime un rôle (vérifie qu'il n'est pas utilisé) |
| `assignPermissions(roleId, permissionIds)` | Assigne des permissions à un rôle en masse |
| `removePermission(roleId, permissionId)` | Retire une permission spécifique d'un rôle |
| `getRolePermissions(roleId)` | Liste toutes les permissions d'un rôle |
| `duplicateRole(id, newName)` | Clone un rôle existant avec ses permissions |

### PermissionsService - Gestion fine des accès

| Méthode | Fonction |
|---------|----------|
| `create(createPermissionDto)` | Crée une nouvelle permission (resource:action comme "reservations:create") |
| `findAll()` | Liste toutes les permissions du système |
| `findByResource(resource)` | Récupère toutes les permissions pour une ressource spécifique |
| `update(id, updatePermissionDto)` | Modifie une permission existante |
| `delete(id)` | Supprime une permission (vérifie les dépendances) |
| `checkPermission(userId, resource, action)` | Vérifie si un utilisateur a une permission spécifique |
| `getUserPermissions(userId)` | Récupère toutes les permissions d'un utilisateur (union de ses rôles) |
| `getRolePermissions(roleId)` | Récupère toutes les permissions d'un rôle |

---

## 2. Services de gestion des établissements

### OrganizationsService - Gestion des organisations (chaînes, groupes)

| Méthode | Fonction |
|---------|----------|
| `create(createOrganizationDto)` | Crée une nouvelle organisation (chaîne hôtelière, groupe) |
| `findAll(pagination)` | Liste toutes les organisations avec pagination |
| `findOne(id)` | Récupère une organisation avec ses propriétés et paramètres |
| `update(id, updateOrganizationDto)` | Modifie les informations de l'organisation |
| `delete(id)` | Supprime une organisation (vérifie les propriétés associées) |
| `getProperties(id)` | Récupère toutes les propriétés (hôtels) de l'organisation |
| `getSettings(id)` | Récupère les paramètres de configuration de l'organisation |
| `updateSettings(id, settings)` | Met à jour les paramètres (devise, fuseau horaire, politiques) |
| `getStatistics(id, dateRange)` | Calcule les statistiques globales (occupation, revenus, etc.) |
| `addMember(organizationId, userId, roleId)` | Ajoute un membre à l'organisation avec un rôle |
| `removeMember(organizationId, userId)` | Retire un membre de l'organisation |
| `getMembers(organizationId)` | Liste tous les membres de l'organisation |

### PropertiesService - Gestion des propriétés (hôtels, résidences)

| Méthode | Fonction |
|---------|----------|
| `create(createPropertyDto)` | Crée une nouvelle propriété avec ses caractéristiques |
| `findAll(filters, pagination)` | Liste les propriétés avec filtres (ville, type, statut) |
| `findOne(id)` | Récupère une propriété avec tous ses détails (chambres, services) |
| `findByOwner(ownerId)` | Récupère toutes les propriétés d'un propriétaire |
| `update(id, updatePropertyDto)` | Met à jour les informations de la propriété |
| `delete(id)` | Supprime une propriété (soft delete) |
| `getRooms(id)` | Liste toutes les chambres de la propriété |
| `getRoomTypes(id)` | Liste tous les types de chambres disponibles |
| `getOccupancyRate(id, startDate, endDate)` | Calcule le taux d'occupation sur une période |
| `getRevenueStats(id, period)` | Calcule les statistiques de revenus (RevPAR, ADR, etc.) |
| `getPropertySettings(id)` | Récupère les paramètres spécifiques de la propriété |
| `updateSettings(id, settings)` | Met à jour les paramètres (check-in/out, politiques) |
| `getCalendar(id, year, month)` | Génère le calendrier des disponibilités |
| `clone(id, newName)` | Duplique une propriété avec sa configuration |

### RoomTypesService - Gestion des types de chambres

| Méthode | Fonction |
|---------|----------|
| `create(createRoomTypeDto)` | Crée un nouveau type de chambre (Standard, Deluxe, Suite) |
| `findAll(propertyId)` | Liste tous les types de chambres d'une propriété |
| `findOne(id)` | Récupère un type de chambre avec ses détails |
| `update(id, updateRoomTypeDto)` | Met à jour le type de chambre (prix, capacités, équipements) |
| `delete(id)` | Supprime un type de chambre (vérifie les réservations existantes) |
| `getRooms(id)` | Liste toutes les chambres de ce type |
| `updateInventory(id, inventory)` | Met à jour le nombre de chambres disponibles |
| `getPricing(id, startDate, endDate)` | Récupère les prix sur une période |
| `updateBasePrice(id, price)` | Met à jour le prix de base du type de chambre |
| `getAvailability(id, startDate, endDate)` | Vérifie la disponibilité sur une période |

### RoomsService - Gestion des chambres individuelles

| Méthode | Fonction |
|---------|----------|
| `create(createRoomDto)` | Crée une nouvelle chambre (numéro, étage, caractéristiques) |
| `findAll(propertyId, filters)` | Liste les chambres avec filtres (statut, type, étage) |
| `findOne(id)` | Récupère une chambre avec son historique |
| `update(id, updateRoomDto)` | Met à jour la chambre (statut, équipements) |
| `delete(id)` | Supprime une chambre (soft delete) |
| `updateStatus(id, status)` | Change le statut de la chambre (propre, sale, maintenance) |
| `getAvailableRooms(propertyId, startDate, endDate)` | Trouve les chambres disponibles sur une période |
| `getMaintenanceRooms(propertyId)` | Liste les chambres en maintenance |
| `assignRoomToReservation(roomId, reservationId)` | Assigne une chambre à une réservation |
| `releaseRoom(roomId)` | Libère une chambre (check-out) |
| `getRoomHistory(id)` | Récupère l'historique des réservations d'une chambre |
| `blockRoom(id, startDate, endDate, reason)` | Bloque une chambre pour maintenance ou rénovation |

---

## 3. Services de réservation

### ReservationsService - Gestion des réservations

| Méthode | Fonction |
|---------|----------|
| `create(createReservationDto)` | Crée une nouvelle réservation, vérifie la disponibilité, calcule le prix |
| `findAll(filters, pagination)` | Liste les réservations avec filtres (dates, statut, client) |
| `findOne(id)` | Récupère une réservation avec ses détails (chambres, factures, paiements) |
| `findByConfirmationCode(code)` | Trouve une réservation par son code de confirmation |
| `findByGuest(guestId)` | Liste toutes les réservations d'un client |
| `update(id, updateReservationDto)` | Modifie une réservation (dates, chambres, services) |
| `cancel(id, reason)` | Annule une réservation, libère les chambres, calcule les pénalités |
| `confirm(id)` | Confirme une réservation en attente |
| `checkIn(id)` | Enregistre l'arrivée du client, change le statut |
| `checkOut(id)` | Enregistre le départ, génère la facture finale |
| `markAsNoShow(id)` | Marque une réservation comme "non présenté" |
| `getUpcomingArrivals(propertyId, days)` | Liste les arrivées prévues dans les X jours |
| `getDepartures(propertyId, date)` | Liste les départs prévus pour une date |
| `getOccupancy(propertyId, startDate, endDate)` | Calcule l'occupation jour par jour |
| `modifyDates(id, newCheckIn, newCheckOut)` | Modifie les dates, recalcule le prix, vérifie disponibilité |
| `addService(id, serviceData)` | Ajoute un service à la réservation (repas, spa, etc.) |
| `sendConfirmationEmail(id)` | Envoie l'email de confirmation de réservation |
| `generateInvoice(id)` | Génère la facture pour la réservation |
| `getStatistics(propertyId, period)` | Calcule les statistiques des réservations |

### AvailabilityService - Gestion des disponibilités

| Méthode | Fonction |
|---------|----------|
| `checkAvailability(propertyId, roomTypeId, startDate, endDate)` | Vérifie si un type de chambre est disponible sur une période |
| `getAvailableRooms(propertyId, startDate, endDate)` | Liste toutes les chambres disponibles sur une période |
| `getAvailableRoomTypes(propertyId, startDate, endDate)` | Liste les types de chambres disponibles |
| `getAvailabilityCalendar(propertyId, year, month)` | Génère un calendrier des disponibilités mois par mois |
| `blockDates(propertyId, roomId, startDate, endDate, reason)` | Bloque des dates pour une chambre |
| `unblockDates(blockId)` | Libère des dates bloquées |
| `getBlockedDates(propertyId, startDate, endDate)` | Liste les dates bloquées sur une période |
| `getOccupancyForecast(propertyId, days)` | Prédit l'occupation future (basé sur historique) |
| `releaseRooms(reservationId)` | Libère les chambres d'une réservation annulée |
| `holdRooms(reservationId, roomIds)` | Réserve temporairement des chambres |

### WaitlistService - Gestion de la liste d'attente

| Méthode | Fonction |
|---------|----------|
| `addToWaitlist(createWaitlistDto)` | Ajoute un client à la liste d'attente |
| `findAll(propertyId)` | Liste tous les clients en liste d'attente |
| `findOne(id)` | Récupère une entrée de liste d'attente |
| `remove(id)` | Retire un client de la liste d'attente |
| `checkAvailability(propertyId)` | Vérifie périodiquement les disponibilités pour la liste d'attente |
| `notifyAvailable(propertyId, roomTypeId, startDate, endDate)` | Notifie les clients quand une chambre devient disponible |
| `getPosition(id)` | Donne la position du client dans la liste d'attente |
| `getStatistics(propertyId)` | Statistiques de la liste d'attente (taille moyenne, taux de conversion) |

---

## 4. Services de facturation et paiements

### InvoicesService - Gestion des factures

| Méthode | Fonction |
|---------|----------|
| `create(createInvoiceDto)` | Crée une nouvelle facture à partir d'une réservation |
| `findAll(filters, pagination)` | Liste les factures avec filtres (statut, période, client) |
| `findOne(id)` | Récupère une facture avec ses lignes et paiements |
| `findByReservation(reservationId)` | Trouve toutes les factures d'une réservation |
| `findByGuest(guestId)` | Trouve toutes les factures d'un client |
| `update(id, updateInvoiceDto)` | Met à jour une facture (ajout de lignes, remises) |
| `delete(id)` | Supprime une facture (uniquement si non payée) |
| `markAsPaid(id, paymentId)` | Marque une facture comme payée |
| `markAsOverdue(id)` | Marque une facture comme en retard |
| `generatePdf(id)` | Génère le PDF de la facture pour impression/envoi |
| `sendByEmail(id, email)` | Envoie la facture par email au client |
| `getOutstandingInvoices(propertyId)` | Liste les factures impayées |
| `getStatistics(propertyId, period)` | Statistiques des factures (montant total, taux de recouvrement) |
| `addItem(invoiceId, createItemDto)` | Ajoute une ligne à une facture |
| `removeItem(invoiceId, itemId)` | Supprime une ligne de facture |
| `applyDiscount(invoiceId, discountDto)` | Applique une remise à la facture |

### PaymentsService - Gestion des paiements

| Méthode | Fonction |
|---------|----------|
| `processPayment(processPaymentDto)` | Traite un paiement (carte, mobile money, espèces) |
| `findAll(filters, pagination)` | Liste les paiements avec filtres |
| `findOne(id)` | Récupère un paiement avec ses détails |
| `refund(id, amount, reason)` | Effectue un remboursement partiel ou total |
| `getPaymentByTransactionId(transactionId)` | Trouve un paiement par son ID transaction |
| `getPaymentsByReservation(reservationId)` | Liste les paiements d'une réservation |
| `getPaymentsByGuest(guestId)` | Liste les paiements d'un client |
| `getPaymentMethods(propertyId)` | Liste les méthodes de paiement disponibles |
| `processMobileMoney(phoneNumber, amount, provider)` | Traite un paiement Mobile Money (Orange, MTN) |
| `processCardPayment(cardDetails, amount)` | Traite un paiement par carte bancaire via Stripe |
| `processCashPayment(amount, receivedAmount)` | Enregistre un paiement en espèces |
| `getDailyCashup(propertyId, date)` | Génère le rapport de caisse journalier |
| `getStatistics(propertyId, period)` | Statistiques des paiements |

### TaxRatesService - Gestion des taxes

| Méthode | Fonction |
|---------|----------|
| `create(createTaxRateDto)` | Crée un nouveau taux de taxe (TVA, taxe de séjour) |
| `findAll(propertyId)` | Liste les taux de taxe applicables |
| `findOne(id)` | Récupère un taux de taxe |
| `update(id, updateTaxRateDto)` | Met à jour un taux de taxe |
| `delete(id)` | Supprime un taux de taxe |
| `getApplicableTaxes(propertyId, amount)` | Calcule les taxes applicables pour un montant |
| `calculateTax(amount, taxRateId)` | Calcule le montant de la taxe |
| `getTaxReport(propertyId, startDate, endDate)` | Génère le rapport des taxes collectées |

---

## 5. Services CRM et marketing

### GuestsService - Gestion des clients

| Méthode | Fonction |
|---------|----------|
| `create(createGuestDto)` | Crée un nouveau client (guest) |
| `findAll(filters, pagination)` | Liste les clients avec filtres (statut, fidélité, segmentation) |
| `findOne(id)` | Récupère un client avec son historique complet |
| `findByEmail(email)` | Trouve un client par son email |
| `findByPhone(phone)` | Trouve un client par son téléphone |
| `update(id, updateGuestDto)` | Met à jour les informations du client |
| `delete(id)` | Supprime un client (soft delete) |
| `getReservations(id)` | Récupère l'historique des réservations du client |
| `getPreferences(id)` | Récupère les préférences du client |
| `updatePreferences(id, preferences)` | Met à jour les préférences (type de chambre, équipements) |
| `addLoyaltyPoints(id, points, reason)` | Ajoute des points de fidélité |
| `redeemLoyaltyPoints(id, points)` | Utilise des points de fidélité |
| `getLoyaltyHistory(id)` | Historique des transactions de fidélité |
| `getStatistics(id)` | Statistiques client (séjours, dépenses, fidélité) |
| `sendMarketingConsent(id, consent)` | Gère le consentement marketing (RGPD) |
| `getSegments(id)` | Récupère les segments du client |
| `mergeGuests(sourceId, targetId)` | Fusionne deux profils clients (dédoublonnage) |

### GuestPreferencesService - Gestion des préférences clients

| Méthode | Fonction |
|---------|----------|
| `create(createPreferenceDto)` | Crée une préférence client (chambre calme, étage élevé) |
| `findByGuest(guestId)` | Liste toutes les préférences d'un client |
| `update(guestId, preferenceType, value)` | Met à jour une préférence spécifique |
| `delete(guestId, preferenceType)` | Supprime une préférence |
| `getRecommendations(guestId)` | Génère des recommandations basées sur les préférences |

### GuestSegmentsService - Segmentation clients

| Méthode | Fonction |
|---------|----------|
| `create(createSegmentDto)` | Crée un segment de clients (critères dynamiques) |
| `findAll(propertyId)` | Liste tous les segments |
| `findOne(id)` | Récupère un segment avec ses critères |
| `update(id, updateSegmentDto)` | Met à jour un segment |
| `delete(id)` | Supprime un segment |
| `getMembers(id, pagination)` | Liste les clients appartenant au segment |
| `updateMembers(id)` | Met à jour les membres du segment (recalcul) |
| `evaluateCriteria(segmentId, guestId)` | Vérifie si un client correspond aux critères |
| `exportSegment(id, format)` | Exporte les membres du segment (CSV, Excel) |
| `getSegmentStatistics(id)` | Statistiques du segment (taille, revenu généré) |

### CampaignsService - Gestion des campagnes marketing

| Méthode | Fonction |
|---------|----------|
| `create(createCampaignDto)` | Crée une nouvelle campagne marketing |
| `findAll(filters, pagination)` | Liste les campagnes avec filtres |
| `findOne(id)` | Récupère une campagne avec ses statistiques |
| `update(id, updateCampaignDto)` | Met à jour une campagne |
| `delete(id)` | Supprime une campagne |
| `schedule(id, scheduledAt)` | Programme l'envoi d'une campagne |
| `cancel(id)` | Annule une campagne programmée |
| `send(id)` | Envoie immédiatement la campagne |
| `duplicate(id, newName)` | Duplique une campagne existante |
| `getStatistics(id)` | Statistiques de la campagne (taux d'ouverture, clics) |
| `getAnalytics(id)` | Analyses détaillées (conversions, revenus générés) |
| `testSend(id, testEmail)` | Envoie un test de la campagne à un email |
| `getAvailableTemplates()` | Liste les templates d'email disponibles |

### CampaignAnalyticsService - Analytics des campagnes

| Méthode | Fonction |
|---------|----------|
| `trackOpen(campaignId, guestId, ip)` | Enregistre l'ouverture d'un email de campagne |
| `trackClick(campaignId, guestId, link)` | Enregistre le clic sur un lien |
| `trackConversion(campaignId, guestId, conversionData)` | Enregistre une conversion (réservation) |
| `getOpenRate(campaignId)` | Calcule le taux d'ouverture |
| `getClickRate(campaignId)` | Calcule le taux de clics |
| `getConversionRate(campaignId)` | Calcule le taux de conversion |
| `getRealtimeStats(campaignId)` | Statistiques en temps réel de la campagne |

---

## 6. Services opérationnels

### HousekeepingService - Gestion du ménage

| Méthode | Fonction |
|---------|----------|
| `createTask(createTaskDto)` | Crée une tâche de ménage pour une chambre |
| `findAll(filters, pagination)` | Liste les tâches avec filtres (statut, priorité, assigné) |
| `findOne(id)` | Récupère une tâche de ménage |
| `update(id, updateTaskDto)` | Met à jour une tâche (priorité, notes) |
| `delete(id)` | Supprime une tâche |
| `assignTask(id, staffId)` | Assigne une tâche à un membre du personnel |
| `startTask(id)` | Démarre l'exécution d'une tâche |
| `completeTask(id, photos)` | Marque une tâche comme terminée, ajoute des photos |
| `skipTask(id, reason)` | Saute une tâche (chambre occupée, etc.) |
| `getTasksByStaff(staffId, date)` | Liste les tâches d'un employé pour une date |
| `getTasksByRoom(roomId)` | Historique des tâches d'une chambre |
| `getDailySchedule(propertyId, date)` | Génère le planning journalier du ménage |
| `getStatistics(propertyId, period)` | Statistiques (temps moyen, productivité) |
| `generateTaskList(propertyId, date)` | Génère la liste des tâches à effectuer |
| `reorderTasks(propertyId, taskOrder)` | Réordonne les priorités des tâches |
| `getStaffPerformance(staffId, period)` | Évalue la performance d'un employé |

### MaintenanceService - Gestion de la maintenance

| Méthode | Fonction |
|---------|----------|
| `createRequest(createRequestDto)` | Crée une demande de maintenance |
| `findAll(filters, pagination)` | Liste les demandes avec filtres |
| `findOne(id)` | Récupère une demande de maintenance |
| `update(id, updateRequestDto)` | Met à jour une demande |
| `delete(id)` | Supprime une demande |
| `assignRequest(id, staffId)` | Assigne une demande à un technicien |
| `startRequest(id)` | Démarre l'intervention |
| `completeRequest(id, resolution)` | Termine l'intervention, note la résolution |
| `cancelRequest(id, reason)` | Annule une demande |
| `getRequestsByProperty(propertyId)` | Liste les demandes d'une propriété |
| `getUrgentRequests(propertyId)` | Liste les demandes urgentes |
| `getStatistics(propertyId, period)` | Statistiques (temps moyen, types de pannes) |
| `getPredictiveMaintenance(propertyId)` | Prédit les maintenances à venir (IA) |
| `schedulePreventiveMaintenance(propertyId, scheduleDto)` | Programme la maintenance préventive |
| `getEquipmentStatus(propertyId)` | État des équipements (climatisation, etc.) |

### GuestRequestsService - Gestion des demandes clients

| Méthode | Fonction |
|---------|----------|
| `create(createRequestDto)` | Crée une demande client (serviettes, réveil, etc.) |
| `findAll(filters, pagination)` | Liste les demandes clients |
| `findOne(id)` | Récupère une demande |
| `update(id, updateRequestDto)` | Met à jour une demande |
| `delete(id)` | Supprime une demande |
| `assign(id, staffId)` | Assigne une demande à un membre du personnel |
| `complete(id)` | Marque une demande comme traitée |
| `cancel(id, reason)` | Annule une demande |
| `getRequestsByGuest(guestId)` | Historique des demandes d'un client |
| `getRequestsByRoom(roomId)` | Demandes par chambre |
| `getPendingRequests(propertyId)` | Demandes en attente de traitement |
| `getStatistics(propertyId, period)` | Statistiques (temps de réponse, satisfaction) |
| `getResponseTime(propertyId)` | Temps moyen de réponse |
| `getSatisfactionRate(propertyId)` | Taux de satisfaction client |

### PosService - Point de vente

| Méthode | Fonction |
|---------|----------|
| `createTransaction(createTransactionDto)` | Crée une transaction POS |
| `findAll(filters, pagination)` | Liste les transactions |
| `findOne(id)` | Récupère une transaction |
| `addItem(transactionId, createItemDto)` | Ajoute un article à la transaction |
| `removeItem(transactionId, itemId)` | Retire un article |
| `completeTransaction(id)` | Finalise la transaction, ajoute à la facture |
| `voidTransaction(id, reason)` | Annule une transaction |
| `getTransactionsByGuest(guestId)` | Transactions d'un client |
| `getTransactionsByReservation(reservationId)` | Transactions d'une réservation |
| `getDailySales(propertyId, date)` | Rapport des ventes journalières |
| `getProductCatalog(propertyId)` | Catalogue des produits disponibles |
| `createProduct(createProductDto)` | Crée un nouveau produit |
| `updateProduct(id, updateProductDto)` | Met à jour un produit |
| `deleteProduct(id)` | Supprime un produit |
| `getInventory(propertyId)` | État des stocks |
| `updateStock(productId, quantity)` | Met à jour le stock |
| `getTopSellingProducts(propertyId, period)` | Produits les plus vendus |

---

## 7. Services de tarification

### PricingService - Gestion des prix

| Méthode | Fonction |
|---------|----------|
| `createRatePlan(createRatePlanDto)` | Crée un plan tarifaire (non remboursable, petit-déjeuner inclus) |
| `findAllRatePlans(propertyId)` | Liste les plans tarifaires |
| `findRatePlan(id)` | Récupère un plan tarifaire |
| `updateRatePlan(id, updateRatePlanDto)` | Met à jour un plan tarifaire |
| `deleteRatePlan(id)` | Supprime un plan tarifaire |
| `calculatePrice(roomTypeId, startDate, endDate, guestCount)` | Calcule le prix total pour un séjour |
| `getDynamicPrice(roomTypeId, date)` | Obtient le prix dynamique pour une date (IA) |
| `setDailyPrice(roomTypeId, date, price)` | Fixe un prix spécifique pour une date |
| `getPriceCalendar(roomTypeId, year, month)` | Calendrier des prix mensuel |
| `applySeasonalRule(propertyId, ruleDto)` | Applique une règle saisonnière |
| `getBestAvailableRate(roomTypeId, startDate, endDate)` | Meilleur tarif disponible |
| `getPriceBreakdown(roomTypeId, startDate, endDate)` | Détail du calcul du prix |
| `getRevenueOptimization(propertyId, period)` | Recommandations d'optimisation des revenus |

### DynamicPricingService - Tarification dynamique IA

| Méthode | Fonction |
|---------|----------|
| `createRule(createRuleDto)` | Crée une règle de tarification dynamique |
| `findAllRules(propertyId)` | Liste les règles actives |
| `findRule(id)` | Récupère une règle |
| `updateRule(id, updateRuleDto)` | Met à jour une règle |
| `deleteRule(id)` | Supprime une règle |
| `activateRule(id)` | Active une règle |
| `deactivateRule(id)` | Désactive une règle |
| `calculateAdjustedPrice(roomTypeId, date, basePrice)` | Calcule le prix ajusté selon les règles |
| `getOccupancyFactor(propertyId, date)` | Facteur d'ajustement basé sur l'occupation |
| `getSeasonalFactor(propertyId, date)` | Facteur saisonnier |
| `getEventFactor(propertyId, date)` | Facteur basé sur les événements locaux |
| `getCompetitorFactor(propertyId, date)` | Facteur basé sur les prix concurrents |
| `getWeatherFactor(propertyId, date)` | Facteur météo |
| `getDemandForecast(propertyId, date)` | Prévision de la demande (IA) |
| `getPriceRecommendation(roomTypeId, date)` | Recommandation de prix optimal |
| `getRevenueImpact(propertyId, period)` | Impact des changements de prix sur les revenus |

---

## 8. Services IA et intelligence artificielle

### IaPricingService - Tarification intelligente

| Méthode | Fonction |
|---------|----------|
| `trainModel(propertyId, historicalData)` | Entraîne le modèle IA sur les données historiques |
| `predictDemand(propertyId, date)` | Prédit la demande pour une date donnée |
| `optimizePrice(roomTypeId, date)` | Optimise le prix pour maximiser les revenus |
| `analyzePriceElasticity(roomTypeId)` | Analyse l'élasticité des prix |
| `getRevenueForecast(propertyId, period)` | Prévoy les revenus futurs |
| `detectAnomalies(propertyId, period)` | Détecte les anomalies de prix/reservations |
| `getCompetitorAnalysis(propertyId)` | Analyse des prix concurrents |
| `getSeasonalityPatterns(propertyId)` | Identifie les patterns saisonniers |
| `getBookingLeadTimeAnalysis(propertyId)` | Analyse des délais de réservation |

### ChatbotService - Assistant virtuel

| Méthode | Fonction |
|---------|----------|
| `processMessage(message, sessionId, propertyId)` | Traite un message utilisateur, génère une réponse |
| `getIntent(message)` | Identifie l'intention de l'utilisateur |
| `extractEntities(message)` | Extrait les entités (dates, chambres, etc.) |
| `getFAQAnswer(question)` | Cherche la réponse dans la FAQ |
| `checkAvailabilityViaChat(propertyId, dates)` | Vérifie les disponibilités via chat |
| `makeReservationViaChat(reservationData)` | Crée une réservation via chat |
| `getGuestInfo(guestId)` | Récupère les infos client |
| `handleServiceRequest(requestData)` | Traite une demande de service (serviettes, réveil) |
| `escalateToHuman(conversationId, reason)` | Transfère à un humain |
| `getConversationHistory(sessionId)` | Historique de la conversation |
| `getSentimentAnalysis(message)` | Analyse le sentiment du message |
| `getSuggestedReplies(context)` | Propose des réponses automatiques |
| `getMultilingualResponse(message, language)` | Réponse multilingue |

### SentimentAnalysisService - Analyse des sentiments

| Méthode | Fonction |
|---------|----------|
| `analyzeReview(reviewText, source)` | Analyse un avis client (positif/négatif/neutre) |
| `extractAspects(reviewText)` | Extrait les aspects mentionnés (propreté, service) |
| `getEmotionAnalysis(reviewText)` | Analyse les émotions (joie, colère, frustration) |
| `aggregateSentiments(propertyId, period)` | Agrège les sentiments sur une période |
| `getSentimentTrends(propertyId)` | Tendance des sentiments dans le temps |
| `alertNegativeReviews(propertyId, threshold)` | Alerte en cas d'avis négatifs |
| `getImprovementSuggestions(propertyId)` | Suggestions d'amélioration basées sur les avis |
| `compareWithCompetitors(propertyId)` | Comparaison des sentiments avec concurrents |
| `getTopPositiveAspects(propertyId)` | Aspects les plus appréciés |
| `getTopNegativeAspects(propertyId)` | Aspects à améliorer |

### RecommendationService - Recommandations personnalisées

| Méthode | Fonction |
|---------|----------|
| `getRoomUpgradeRecommendation(guestId, reservationId)` | Recommande un upgrade de chambre |
| `getServiceRecommendations(guestId)` | Recommande des services (spa, restaurant) |
| `getPackageRecommendations(guestId)` | Recommande des packages (séjour + activités) |
| `getPersonalizedOffers(guestId)` | Génère des offres personnalisées |
| `getSimilarProperties(propertyId, guestId)` | Recommande des propriétés similaires |
| `getNextStayRecommendation(guestId)` | Prédit le prochain séjour |
| `getCrossSellRecommendations(reservationId)` | Recommandations de vente croisée |
| `getUpsellRecommendations(reservationId)` | Recommandations d'upgrade |
| `trackRecommendationPerformance(recommendationId)` | Suivi des performances des recommandations |
| `retrainRecommendationModel(propertyId)` | Réentraîne le modèle de recommandation |

### PredictiveMaintenanceService - Maintenance prédictive

| Méthode | Fonction |
|---------|----------|
| `analyzeEquipmentData(propertyId, equipmentType)` | Analyse les données des équipements |
| `predictFailureDate(equipmentId)` | Prédit la date de panne probable |
| `getMaintenanceAlerts(propertyId)` | Alertes de maintenance préventive |
| `schedulePredictiveMaintenance(propertyId)` | Planifie les maintenances prédictives |
| `getEquipmentHealthScore(equipmentId)` | Score de santé de l'équipement |
| `analyzeFailurePatterns(propertyId)` | Analyse les patterns de pannes |
| `getMaintenanceCostOptimization(propertyId)` | Optimisation des coûts de maintenance |
| `getEquipmentLifespanPrediction(equipmentId)` | Prédiction de durée de vie |
| `getUrgentInterventions(propertyId)` | Interventions urgentes recommandées |

---

## 9. Services d'intégration

### OtaIntegrationService - Intégration OTAs

| Méthode | Fonction |
|---------|----------|
| `syncAvailability(propertyId, startDate, endDate)` | Synchronise les disponibilités avec Booking, Expedia |
| `syncRates(propertyId, startDate, endDate)` | Synchronise les tarifs avec les OTAs |
| `importReservations(propertyId, otaName)` | Importe les réservations depuis les OTAs |
| `exportReservations(propertyId, otaName)` | Exporte les réservations vers les OTAs |
| `handleWebhook(payload, otaName)` | Traite les webhooks des OTAs |
| `getOtaConnectionStatus(propertyId, otaName)` | Statut de connexion à l'OTA |
| `reconnectOta(propertyId, otaName)` | Reconnecte une OTA déconnectée |
| `getOtaCommissionReport(propertyId, period)` | Rapport des commissions OTA |
| `getOtaPerformance(propertyId, period)` | Performance par OTA |
| `optimizeChannelMix(propertyId)` | Optimise la répartition des canaux |

### PaymentGatewayService - Passerelle de paiement

| Méthode | Fonction |
|---------|----------|
| `initializePayment(paymentData)` | Initialise un paiement (Stripe, Mobile Money) |
| `processPaymentWebhook(payload, provider)` | Traite les webhooks de confirmation |
| `verifyPayment(transactionId)` | Vérifie le statut d'un paiement |
| `refundPayment(transactionId, amount)` | Effectue un remboursement |
| `getPaymentMethods()` | Liste les méthodes disponibles |
| `validateCardDetails(cardDetails)` | Valide les informations de carte |
| `processMobileMoneyPayment(phoneNumber, amount, provider)` | Traite un paiement Mobile Money |
| `getTransactionStatus(transactionId)` | Statut de transaction |
| `generatePaymentLink(amount, description)` | Génère un lien de paiement |
| `getPaymentAnalytics(propertyId, period)` | Analytics des paiements |

### NotificationService - Notifications

| Méthode | Fonction |
|---------|----------|
| `sendEmail(to, subject, template, context)` | Envoie un email (via SendGrid) |
| `sendSms(to, message)` | Envoie un SMS (via Twilio) |
| `sendPushNotification(userId, title, body, data)` | Envoie une notification push |
| `sendInAppNotification(userId, title, body, type)` | Notification in-app |
| `sendReservationConfirmation(reservationId)` | Envoie confirmation de réservation |
| `sendPreArrivalReminder(reservationId)` | Rappel pré-arrivée |
| `sendPostStayFeedback(reservationId)` | Demande d'avis post-séjour |
| `sendPasswordReset(email, token)` | Email de réinitialisation |
| `sendMagicLink(email, token)` | Lien magique pour connexion |
| `sendWelcomeEmail(userId)` | Email de bienvenue |
| `sendPromotionalOffer(segmentId, offerData)` | Offre promotionnelle à un segment |
| `getNotificationHistory(userId, pagination)` | Historique des notifications |
| `markAsRead(notificationId)` | Marque une notification comme lue |

---

## 10. Services de reporting

### ReportingService - Rapports et analytics

| Méthode | Fonction |
|---------|----------|
| `getOccupancyReport(propertyId, period)` | Rapport d'occupation |
| `getRevenueReport(propertyId, period)` | Rapport de revenus |
| `getFinancialReport(propertyId, period)` | Rapport financier complet |
| `getGuestReport(propertyId, period)` | Rapport sur la clientèle |
| `getChannelReport(propertyId, period)` | Rapport par canal de vente |
| `getHousekeepingReport(propertyId, period)` | Rapport du ménage |
| `getMaintenanceReport(propertyId, period)` | Rapport de maintenance |
| `exportReportToExcel(reportId, format)` | Exporte le rapport en Excel |
| `exportReportToPdf(reportId)` | Exporte le rapport en PDF |
| `scheduleReport(reportConfig)` | Programme un rapport récurrent |
| `getDashboardKpis(propertyId)` | KPIs pour tableau de bord |
| `getComparativeAnalysis(propertyId, period)` | Analyse comparative (année précédente) |
| `getForecastReport(propertyId, period)` | Rapport prévisionnel |
| `getCustomReport(propertyId, parameters)` | Rapport personnalisé |

### KpiService - Indicateurs de performance

| Méthode | Fonction |
|---------|----------|
| `calculateRevPAR(propertyId, date)` | Revenu par chambre disponible |
| `calculateADR(propertyId, date)` | Prix moyen par chambre vendue |
| `calculateOccupancyRate(propertyId, date)` | Taux d'occupation |
| `calculateGOPPAR(propertyId, date)` | Bénéfice brut par chambre disponible |
| `calculateTrevor(propertyId, date)` | Taux de revenu par client |
| `calculateNPS(propertyId, period)` | Net Promoter Score |
| `calculateAverageLengthOfStay(propertyId, period)` | Durée moyenne de séjour |
| `calculateBookingLeadTime(propertyId, period)` | Délai moyen de réservation |
| `calculateCancellationRate(propertyId, period)` | Taux d'annulation |
| `calculateConversionRate(propertyId, period)` | Taux de conversion |
| `calculateMarketPenetrationIndex(propertyId)` | Indice de pénétration du marché |
| `calculateRevenueGrowth(propertyId, period)` | Croissance des revenus |
| `getAllKpis(propertyId, date)` | Tous les KPIs à une date |
| `getKpiTrends(propertyId, kpiName, period)` | Tendance d'un KPI |
| `compareKpis(propertyId, competitorIds, kpiNames)` | Comparaison avec concurrents |
