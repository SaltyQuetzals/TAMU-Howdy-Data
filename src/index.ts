import {Term} from './term';
import * as fs from 'fs';
import {CompassDepartment} from "./compass";

const downloadDepartmentData = async (term: Term, dept: CompassDepartment, retriesRemaining = Term.MAX_RETRIES): Promise<CompassDepartment> => {
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
            return dept;
        } catch (err) {
            console.log(`Failed to download ${dept.code}.`);
            console.error(err);
            retriesRemaining -= 1;
        }
    }
    throw new Error(`Failed to download ${dept.code} after ${Term.MAX_RETRIES} tries.`);
}

const collectAllData = async (term: Term) => {
    const departments = await term.departments();
    //
    // const departmentPromises = [];
    // for (const department of departments) {
    //     departmentPromises.push(downloadDepartmentData(term, department).then((departmentData) => {
    //         fs.writeFile(
    //                 `data/${term.termCode}/${departmentData.code}.json`,
    //                 JSON.stringify(departmentData, null, 3),
    //                 err => {
    //                     if (err) {
    //                         console.error(err);
    //                     }
    //                     console.log(departmentData.code);
    //                 }
    //             );
    //     }))
    // }
    // await Promise.all(departmentPromises);
    for (const department of departments) {
        const departmentData = await downloadDepartmentData(term, department);
        fs.writeFile(
            `data/${term.termCode}/${departmentData.code}.json`,
            JSON.stringify(departmentData, null, 3),
            err => {
                if (err) {
                    console.error(err);
                }
                console.log(departmentData.code);
            }
        );
    }
};

async function main() {
    if (!fs.existsSync('data')) {
        fs.mkdirSync('data');
    }
    const terms = await Term.allTerms();
    for (const {code} of terms) {
        console.log('====================================================');
        console.log(code);
        console.log('====================================================');
        if (!fs.existsSync(`data/${code}`)) {
            fs.mkdirSync(`data/${code}`);
        }
        const term = new Term(code);
        await collectAllData(term);
    }
}

main();
