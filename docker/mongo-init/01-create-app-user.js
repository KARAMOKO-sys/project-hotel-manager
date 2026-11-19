// Exécuté par l'image mongo au PREMIER démarrage (volume vide) uniquement.
// Crée l'utilisateur applicatif de l'API, limité à la base PleasantStay.
const dbName = process.env.MONGO_DB_NAME || 'bd_pleasantstay';
const user = process.env.MONGO_APP_USERNAME;
const password = process.env.MONGO_APP_PASSWORD;
if (!user || !password) {
  throw new Error('MONGO_APP_USERNAME et MONGO_APP_PASSWORD sont requis');
}
db.getSiblingDB(dbName).createUser({
  user,
  pwd: password,
  roles: [{ role: 'readWrite', db: dbName }, { role: 'dbAdmin', db: dbName }],
});
print(`Utilisateur ${user} créé sur ${dbName}`);
