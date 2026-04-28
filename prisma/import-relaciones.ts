import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const filePath = String.raw`c:\Users\fayru\Documents\Nueva carpeta (3)\bd.csv`;
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  
  // Skip the header
  const dataLines = lines.slice(1);
  
  let added = 0;
  for (const line of dataLines) {
    // split by ';' but respect quotes if necessary, though simple split(';') should work 
    // since there are no semicolons inside data
    const parts = line.split(';');
    
    if (parts.length >= 3) {
      const producto = parts[1].replace(/^"|"$/g, '').trim();
      const relacion = parts[2].replace(/^"|"$/g, '').trim();
      
      if (producto && relacion) {
        await prisma.productoRelacion.upsert({
          where: { producto },
          update: { relacion },
          create: { producto, relacion }
        });
        added++;
        console.log(`Upserted: ${producto} -> ${relacion}`);
      }
    }
  }

  console.log(`Finished processing. Upserted ${added} records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
