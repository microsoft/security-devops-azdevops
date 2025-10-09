/*
* Interface for the MicrosoftDefenderCLI task
*/
export interface IMicrosoftDefenderCLI {
    readonly succeedOnError: boolean;
    run(): any;
}
