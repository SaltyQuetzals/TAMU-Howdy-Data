import { Term } from './term';
import * as fs from 'fs';
import { CompassDepartment } from './compass';
import { promisify } from 'util';
import PQueue from 'p-queue';

const promisifiedWriteFile = promisify(fs.writeFile);

const BATCH_SIZE = 7;

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

const downloadDepartmentData = async (
  term: Term,
  dept: CompassDepartment,
  retriesRemaining = Term.MAX_RETRIES
): Promise<{ dept: CompassDepartment; elapsed: number }> => {
  const startTime = Date.now();
  while (retriesRemaining > 0) {
    try {
      dept.courses = {};
      const courses = await term.courses(dept.code);

      for (const course of courses) {
        course.sections = [];
        dept.courses[course.courseNumber] = course;
      }

      const sections = await term.sectionsForDepartment(dept.code, true);
      for (const section of sections) {
        dept.courses[section.courseNumber].sections!.push(section);
      }
      return { dept, elapsed: Date.now() - startTime };
    } catch (err) {
      console.log(`Failed to download ${dept.code}.`);
      console.error(err);
      retriesRemaining -= 1;
    }
  }
  throw new Error(
    `Failed to download ${dept.code} after ${Term.MAX_RETRIES} tries.`
  );
};

const collectAllDataInParallel = async (term: Term) => {
  const depts = await term.departments();
  const deptDownloadPromises = depts.map(dept =>
    downloadDepartmentData(new Term(term.termCode), dept).then(
      ({ dept, elapsed }) => {
        console.log(
          `${term.termCode}: ${dept.code} completed afer ${elapsed /
          1000} seconds.`
        );
        return promisifiedWriteFile(
          `data/${term.termCode}/${dept.code}.json`,
          JSON.stringify(dept)
        );
      }
    )
  );
  await Promise.all(deptDownloadPromises);
};

const collectAllDataInBatches = async (term: Term) => {
  const depts = shuffle(await term.departments());
  const queue = new PQueue({ concurrency: BATCH_SIZE });
  for (const dept of depts) {
    queue.add(() =>
      downloadDepartmentData(new Term(term.termCode), dept).then(
        ({ dept, elapsed }) => {
          console.log(
            `${term.termCode}: ${dept.code} completed afer ${elapsed /
            1000} seconds.`
          );
          return promisifiedWriteFile(
            `data/${term.termCode}/${dept.code}.json`,
            JSON.stringify(dept)
          );
        }
      )
    );
  }
  await queue.onIdle();
};

async function main() {
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }
  const terms = shuffle(await Term.allTerms());
  for (let i = 0; i < terms.length; ++i) {
    const term = terms[i];
    if (!fs.existsSync(`data/${term.code}`)) {
      fs.mkdirSync(`data/${term.code}`);
    }
    const start = Date.now();
    console.log('================================');
    console.log(term.code);
    console.log('================================');
    await collectAllDataInBatches(new Term(term.code));
    const end = Date.now();
    console.log(`Finished ${term.code} in ${(end - start) / 1000} seconds.`);
    console.log(`${i}/${terms.length}`);
  }
}

main();
