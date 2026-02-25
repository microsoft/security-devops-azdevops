/*
* Interface for the MicrosoftDefenderCLI task
*/
export interface IMicrosoftDefenderCLI {
    readonly succeedOnError: boolean;
    run(): any;
}

/*
* Interface for the factory that creates IMicrosoftDefenderCLI instances
*/
export interface IMicrosoftDefenderCLIFactory {
    new(): IMicrosoftDefenderCLI;
}
