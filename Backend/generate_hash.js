const bcrypt = require('bcrypt');

const plainPassword = '#Ez@8542Blog'; // Votre nouveau mot de passe
const saltRounds = 10; // Le coût du hachage (utilisez la même valeur que dans votre application si possible, 10 est courant)

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error('Erreur lors du hachage :', err);
        return;
    }
    console.log('Hachage bcrypt pour le nouveau mot de passe :');
    console.log(hash);
});