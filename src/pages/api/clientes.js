import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { name, email, phone, birthDate, country, documentType, documentNumber } = req.body;

  if (!name || !email || !phone || !birthDate || !country || !documentType || !documentNumber) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  try {
    const cliente = await prisma.cliente.create({
      data: {
        name, email, phone,
        birthDate: new Date(birthDate),
        country, documentType, documentNumber,
      },
    });
    return res.status(201).json({ message: 'Cliente registrado exitosamente.', id: cliente.id });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}