import { Container } from "dockerode";
interface StartESOptions {
    port?: number;
    indexes?: ESIndex[];
}
interface ESIndex {
    name: string;
    body: Record<string, unknown>;
}
export declare let esContainer: Container;
export declare function start(options: StartESOptions): Promise<void>;
export declare function stop(): Promise<void>;
export {};
