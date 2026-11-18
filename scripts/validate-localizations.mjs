import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { guideLibrary } from '../guides.js';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const languages = ['fr', 'en', 'es', 'de', 'ru', 'tr', 'ko', 'ar'];
const guides = Object.values(guideLibrary).flat();
const errors = [];
const imageCounts = Object.fromEntries(languages.map((language) => [language, 0]));

for (const guide of guides) {
  for (const language of languages) {
    const localized = guide.localized?.[language];
    if (!localized?.title || !localized?.image) {
      errors.push(`${guide.slug}: missing ${language} localization`);
      continue;
    }

    const imagePath = join(projectDirectory, 'public', localized.image.replace(/^\//, ''));
    if (existsSync(imagePath)) imageCounts[language] += 1;
  }
}

if (guides.length !== 47) errors.push(`expected 47 guides, found ${guides.length}`);

console.log(`Guides: ${guides.length}`);
for (const language of languages) {
  console.log(`${language}: ${imageCounts[language]}/${guides.length} images`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
}
