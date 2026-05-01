"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailEvent = void 0;
const node_events_1 = require("node:events");
exports.emailEvent = new node_events_1.EventEmitter({});
exports.emailEvent.on("sendEmail", async (fn) => {
    try {
        await fn();
    }
    catch (error) {
        console.log(`fail in email event >>> ${error}`);
    }
});
