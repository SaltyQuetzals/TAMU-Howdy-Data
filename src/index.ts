import { Term } from './term';
import * as fs from 'fs';
import { CompassDepartment, CompassCourse } from './compass';
import { promisify } from 'util';

const promisifiedWriteFile = promisify(fs.writeFile);

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

const collectAllData = async (term: Term) => {
  const departments = await term.departments();
  const departmentPromises = departments.map(department =>
    downloadDepartmentData(new Term(term.termCode), department).then(
      ({ dept, elapsed }) => {
        console.log(
          term.termCode,
          ': ',
          dept.code,
          'completed after',
          elapsed / 1000,
          'seconds'
        );
        return dept;
      }
    )
  );
  const departmentData = await Promise.all(departmentPromises);
  const allCourses: {
    courses: { [deptCourseCombo: string]: CompassCourse };
    updatedAt: Date;
  } = { courses: {}, updatedAt: new Date() };
  for (const dept of departmentData) {
    for (const courseNum of Object.keys(dept.courses)) {
      const course = dept.courses[courseNum];
      allCourses.courses[`${dept.code} ${courseNum}`] = course;
    }
  }
  allCourses.updatedAt = new Date();
  await promisifiedWriteFile(
    `data/${term.termCode}.json`,
    JSON.stringify(allCourses)
  );
};

async function main() {
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }
  const terms = await Term.allTerms();
  for (const term of terms.reverse()) {
    console.log("================================");
    console.log(term.code);
    console.log("================================");
    await collectAllData(new Term(term.code));
  }
}

main();
