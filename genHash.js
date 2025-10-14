import bcrypt from 'bcrypt';

const password = "Showmethemoney$$"; // tu contraseña real
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) console.error(err);
  else console.log("Hash generado:", hash);
});
