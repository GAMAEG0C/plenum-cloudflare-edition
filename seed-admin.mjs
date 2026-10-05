import bcrypt from 'bcryptjs';

async function run() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Plenum2026.', salt);
  console.log(hash);
}
run();
