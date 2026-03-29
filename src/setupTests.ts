import "@testing-library/jest-dom";
import PouchDB from 'pouchdb';
import PouchDBAdapterMemory from 'pouchdb-adapter-memory';
import { webcrypto } from "node:crypto";

// @ts-ignore
if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = webcrypto;
}

// @ts-ignore
globalThis.process = { ...globalThis.process, browser: true };

// Mock scrollIntoView for Radix UI select components
HTMLElement.prototype.scrollIntoView = () => {};

// Mock ResizeObserver for Radix UI and other components
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

PouchDB.plugin(PouchDBAdapterMemory);
