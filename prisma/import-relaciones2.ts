import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const filePath = String.raw`c:\Users\fayru\Documents\Nueva carpeta (3)\bd.csv`;
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  
  // Skip the header
  const dataLines = lines.slice(1);
  
  let added = 0;
  for (const line of dataLines) {
    let cleanLine = line.trim();
    if (cleanLine.startsWith('"')) {
      cleanLine = cleanLine.substring(1);
    }
    if (cleanLine.endsWith('"')) {
      cleanLine = cleanLine.substring(0, cleanLine.length - 1);
    }
    
    // The data is separated by ";"
    const parts = cleanLine.split('";"');
    
    if (parts.length >= 3) {
      let producto = parts[1].trim();
      
      // Fix HTML entities
      producto = producto
        .replace(/&NTILDE;/gi, 'N')
        .replace(/&Aacute;/gi, 'A')
        .replace(/&Eacute;/gi, 'E')
        .replace(/&Iacute;/gi, 'I')
        .replace(/&Oacute;/gi, 'O')
        .replace(/&Uacute;/gi, 'U')
        .replace(/&AMP;/gi, '&');

      const relacion = parts[2].trim();
      
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
