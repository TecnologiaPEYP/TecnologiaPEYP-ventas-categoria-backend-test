import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const filePath = String.raw`c:\Users\fayru\Documents\Nueva carpeta (3)\bd.csv`;
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  const dataLines = lines.slice(1);
  
  let added = 0;
  for (const line of dataLines) {
    // line looks like: 6199;"LASA&NTILDE;A";"PLATOS FUERTES";"date"
    // Let's use a regex to extract fields. Semicolons inside quotes won't be split if we parse correctly.
    // Regex matching CSV with ; delimiter
    const matches = [...line.matchAll(/(?:^|;)(?:"([^"]*)"|([^;]*))/g)];
    
    // matches[0] = id
    // matches[1] = producto
    // matches[2] = relacion
    // group 1 is quoted value, group 2 is unquoted value
    const parts = matches.map(m => m[1] ?? m[2] ?? '');

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

main().finally(async () => { await prisma.$disconnect(); });
