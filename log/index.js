'use strict';

const canvas = require('../canvas');

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

exports.error = async (msg) => new Promise(async function (resolve, reject) {
    try {
        const timestamp = new Date().toISOString();
        console.log(`[PID:${process.pid}][PPID:${process.ppid}][${timestamp}] ERROR ${msg}`);
        resolve(true);
    }
    catch (error) {
        reject(error);
    }
});
