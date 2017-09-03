
export class Model {
    public readonly projects: Array<Project>;

    constructor (pendingData: any) {
        this.projects = Object.keys(pendingData)
            .map(project => new Project(project, pendingData[project]));
    }
}

export class Project {
    public readonly dependencies: Array<Dependency>;
    constructor(
        public readonly name: string,
        pendingData: any
    ) {
        this.dependencies = Object.keys(pendingData)
            .map(dep => new Dependency(dep, pendingData[dep]));
    }
}

export class Dependency {
    public readonly pending: { [semver: string]: string };
    constructor(
        public readonly name: string,
        depData: any
    ) {
        this.pending = depData;
    }
}
