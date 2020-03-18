import Axios, {AxiosInstance, AxiosResponse} from 'axios';
import * as qs from 'querystring';
import {
    CompassCourse,
    CompassDepartment,
    CompassFaculty,
    CompassSection,
    CompassSectionFaculty,
    PaginatedCompassResponse,
    TermCode,
} from './compass';
import {URL} from 'url';
import axiosRetry from 'axios-retry';

const BASE_URL = 'https://compassxe-ssb.tamu.edu';

export class Term {
    static MAX_PAGE_SIZE = 500;
    static MAX_RETRIES = 10;
    private readonly client: AxiosInstance;

    constructor(public termCode: TermCode) {
        this.client = Axios.create({baseURL: BASE_URL});
        axiosRetry(this.client, {retries: Term.MAX_RETRIES, retryCondition: error => true});
    }

    /**
     * Spoofs getting cookies from Compass, which are needed for the API to deliver consistent results.
     * Without cookies, some responses will contain incorrect data despite URLs being correct.
     */
    private async addCookies() {
        const endpoint =
            '/StudentRegistrationSsb/ssb/term/search?mode=courseSearch';
        const formData = {
            dataType: 'json',
            term: this.termCode,
        };
        const response = await this.client.post(endpoint, qs.stringify(formData));
        const [cookie] = response.headers['set-cookie'];
        this.client.defaults.headers.Cookie = cookie;
    }

    /**
     * Will request all paginated data at a certain endpoint.
     * @param pathString The endpoint to hit
     * @param fetchOne The function for retrieving a single page of data (will be run for each page)
     */
    private async fetchAndCombinePaginatedResponses<T>(
        pathString: string,
        fetchOne: (urlString: string) => Promise<T[]>
    ): Promise<T[]> {
        const url = new URL(BASE_URL + pathString);
        url.searchParams.set('pageMaxSize', String(Term.MAX_PAGE_SIZE));
        const collected: T[] = [];
        while (true) {
            url.searchParams.set('pageOffset', String(collected.length));
            const newData = await fetchOne(url.toString());
            if (!newData || newData.length === 0) break;
            collected.push(...newData);
        }
        return collected;
    }

    /**
     * Retrieves all departments offered during this term.
     */
    async departments(): Promise<CompassDepartment[]> {
        const endpoint = `/StudentRegistrationSsb/ssb/classSearch/get_subject?searchTerm=&term=${this.termCode}&offset=1&max=1728`;
        const response: AxiosResponse<CompassDepartment[]> = await this.client.get(
            endpoint,
            {
                withCredentials: true,
            }
        );
        return response.data;
    }

    /**
     * Gets the full HTML course description of a Compass course
     */
    private async getCourseDescription(
        subject: string,
        courseNum: string
    ): Promise<string> {
        const endpoint = `/StudentRegistrationSsb/ssb/courseSearchResults/getCourseDescription`;
        const payload = {
            term: this.termCode,
            subjectCode: subject,
            courseNumber: courseNum,
        };
        const response = await this.client.post(endpoint, qs.stringify(payload));
        return response.data.trim();
    }

    /**
     * Helper function for updating a set of courses with their full descriptions
     * @param courses A list of Compass courses.
     */
    private async updateEachCourseWithFullDescription(courses: CompassCourse[]) {
        for (let i = 0; i < courses.length; ++i) {
            courses[i].courseDescription = await this.getCourseDescription(courses[i].subjectCode, courses[i].courseNumber);
        }
        return courses;
    }

    /**
     * Requests all courses for a specific department during this term.
     * @param dept The given department code.
     */
    async courses(dept: string): Promise<CompassCourse[]> {
        const endpoint = `/StudentRegistrationSsb/ssb/courseSearchResults/courseSearchResults?txt_subject=${dept}&txt_term=${this.termCode}`;
        const compassCourses = await this.fetchAndCombinePaginatedResponses<CompassCourse>(endpoint, urlString =>
            this.client
                .get(urlString)
                .then(
                    (response: AxiosResponse<PaginatedCompassResponse<CompassCourse>>) =>
                        response.data.data
                )
                .catch(err => {
                    console.error(`Error fetching ${urlString}`);
                    throw err;
                })
        );
        return this.updateEachCourseWithFullDescription(compassCourses);
    }

    /**
     * Replaces the sections in the given sectionPromise with fully-hydrated faculty members.
     * @param sectionPromise
     */
    private async addFullFaculty(sectionPromise: Promise<CompassSection[]>): Promise<CompassSection[]> {
        return sectionPromise.then(sections => {
            return Promise.all(
                sections.map(section => {
                    return this.faculty(...section.faculty as CompassSectionFaculty[]).then(fullFaculty => {
                        section.faculty = fullFaculty;
                        return section;
                    });
                })
            );
        });
    }

    // async sectionsForCourse(subjectCourse: string, withFaculty = false) {
    //   await this.addCookies();
    //   const sectionPromise = this.fetchAndCombinePaginatedResponses<
    //     CompassSection
    //   >(
    //     `/StudentRegistrationSsb/ssb/searchResults/searchResults?txt_subjectcoursecombo=${subjectCourse}&txt_term=${this.termCode}`,
    //     urlString =>
    //       this.client
    //         .get(urlString, { withCredentials: true })
    //         .then(response => response.data.data)
    //   );
    //   if (!withFaculty) {
    //     return sectionPromise;
    //   }
    //   return this.addFullFaculty(sectionPromise);
    // }

    /**
     * Gets all sections for a specific department in this term
     * @param dept The code of the department in this term
     * @param withFaculty Whether or not to add hydrated faculty
     */
    async sectionsForDepartment(dept: string, withFaculty = false) {
        await this.addCookies();
        const sectionPromise = this.fetchAndCombinePaginatedResponses<CompassSection>(
            `/StudentRegistrationSsb/ssb/searchResults/searchResults?txt_subject=${dept}&txt_term=${this.termCode}`,
            urlString =>
                this.client
                    .get(urlString, {withCredentials: true})
                    .then(response => response.data.data)
        );
        if (!withFaculty) {
            return sectionPromise;
        }
        return this.addFullFaculty(sectionPromise);
    }

    /**
     * Gets hydrated faculty members, given their "dehydrated" versions.
     * @param facultyMembers
     */
    async faculty(...facultyMembers: CompassSectionFaculty[]): Promise<CompassFaculty[]> {
        this.addCookies();
        const fullFaculty: CompassFaculty[] = [];
        for (const facultyMember of facultyMembers) {
            let retries = Term.MAX_RETRIES;
            while (retries > 0) {
                try {
                    const response = await this.client.get(`/StudentRegistrationSsb/ssb/contactCard/retrieveData?bannerId=${facultyMember.bannerId}&termCode=${this.termCode}`);
                    const fullMember = response.data.personData as CompassFaculty;
                    if (fullMember.cvExists) {
                        fullMember.cvUrl = BASE_URL + fullMember.cvUrl;
                    }
                    fullFaculty.push(fullMember);
                } catch (err) {
                    console.error(`Failed to retrieve ${BASE_URL}/StudentRegistrationSsb/ssb/contactCard/retrieveData?bannerId=${facultyMember.bannerId}&termCode=${this.termCode}`)
                    retries -= 1;
                }
            }
        }
        return fullFaculty;
    }

    static async allTerms(): Promise<Array<{ code: string; description: string }>> {
        const response = await Axios.get(
            BASE_URL +
            `/StudentRegistrationSsb/ssb/courseSearch/getTerms?dataType=json&offset=1&max=${Term.MAX_PAGE_SIZE}`
        );
        return response.data;
    }
}
