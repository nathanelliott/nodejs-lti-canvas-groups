'use strict';

const globalDebugMode = false;

exports.info = async (msg) => new Promise(async function (resolve, reject) {
    try {
        const timestamp = new Date().toISOString();
        console.log(`[PID:${process.pid}][PPID:${process.ppid}][${timestamp}] ${msg}`);
        resolve(true);
    }
    catch (error) {
        reject(error);
    }
});

exports.debug = async (msg) => new Promise(async function (resolve, reject) {
    if (globalDebugMode) {
        try {
            const timestamp = new Date().toISOString();
            console.log(`[PID:${process.pid}][PPID:${process.ppid}][${timestamp}] ${msg}`);
        }
        catch (error) {
            reject(error);
        }    
    }
    resolve(true);
});

exports.error = async (msg) => new Promise(async function (resolve, reject) {
    try {
        const timestamp = new Date().toISOString();
        console.error(`[PID:${process.pid}][PPID:${process.ppid}][${timestamp}] ${msg}`);
        resolve(true);
    }
    catch (error) {
        reject(error);
    }
});
