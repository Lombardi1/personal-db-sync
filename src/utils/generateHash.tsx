import { useEffect, useState } from 'react';
import bcrypt from 'bcryptjs';

export function GenerateHash() {
  const [hash, setHash] = useState('');

  useEffect(() => {
    const generateHash = async () => {
      const password = 'password123';
      const salt = await bcrypt.genSalt(10);
      const generatedHash = await bcrypt.hash(password, salt);
      setHash(generatedHash);
      console.log('Hash generato per "password123":', generatedHash);
    };
    generateHash();
  }, []);

  return (
    <div className="p-8 bg-white">
      <h2 className="text-xl font-bold mb-4">Hash Generator</h2>
      <p className="mb-2">Password: password123</p>
      <div className="p-4 bg-gray-100 rounded break-all">
        <p className="font-mono text-sm">{hash}</p>
      </div>
      <p className="mt-4 text-sm">Copia questo hash e usalo nel database per l'utente admin</p>
    </div>
  );
}
