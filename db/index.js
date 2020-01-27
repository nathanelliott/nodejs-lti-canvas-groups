'use strict';

const sqlite3 = require('sqlite3').verbose();
const log = require('../log');
const dbPath = './db/token.db';

exports.upgradeDatabase = () => new Promise(async function(resolve, reject) {
    resolve();
});

exports.setupDatabase = () => new Promise(async function(resolve, reject) {
    let db = new sqlite3.Database(dbPath, (error) => {
        if (error) {
            log.error(error.message);

            db.close();
            reject();
        }
        else {
            db.serialize(function() {
                db.run('CREATE TABLE IF NOT EXISTS tokens (user_id TEXT NOT NULL, user_env TEXT NOT NULL, ' + 
                'api_token TEXT NOT NULL, refresh_token TEXT NOT NULL, expires_at_utc DATETIME NOT NULL, updated_at DATETIME NOT NULL DEFAULT current_timestamp, ' +
                'PRIMARY KEY (user_id, user_env))');
            });

            db.close();
            log.info("[DB] Database main table 'tokens' ready.");

            resolve();
        }
    });
});

exports.getAllClientsData = () => new Promise(async function(resolve, reject) {
    let db = new sqlite3.Database(dbPath, (error) => {
        if (error) {
            log.error(error.message);
            reject();
        }
        else {
            log.info("[DB] Querying all data for all clients.");

            var clientData = [];
        
            db.all("SELECT DISTINCT user_id, user_env, api_token, refresh_token, expires_at_utc, updated_at FROM tokens ORDER BY updated_at DESC", [], function(error, rows) {
                if (error) {
                    log.error(error);

                    db.close();
                    reject(error);
                }
                else {
                    rows.forEach((row) => {
                        var thisData = {
                            user_id: row.user_id,
                            user_env: row.user_env,
                            api_token: row.api_token,
                            refresh_token: row.refresh_token,
                            expires_at: new Date(row.expires_at_utc).toISOString(),
                            updated_at: new Date(row.updated_at).toISOString()
                        };

                        clientData.push(thisData);
                    });

                    db.close();
                    resolve(clientData);
                }
            });
        }
    });
});

exports.setClientData = (userId, env, token, refresh, expires) => new Promise(function(resolve, reject) {
    let db = new sqlite3.Database(dbPath, (error) => {
        if (error) {
            log.error(error.message);
            reject();
        }
        else {
            log.info("[DB] INSERT OR REPLACE INTO tokens (user_id, user_env, api_token, refresh_token, expires_at_utc) VALUES (" + userId + ", " + env + ", " + token + ", " + refresh + ", " + expires + ")");

            db.run("INSERT OR REPLACE INTO tokens (user_id, user_env, api_token, refresh_token, expires_at_utc) VALUES (?, ?, ?, ?, ?)", [userId, env, token, refresh, expires], function(error) {
                if (error) {
                    log.error(error);
        
                    db.close();
                    reject();
                }
                else {
                    log.info("[DB] Replaced token data for user_id '" + userId + "'");

                    db.close();
                    resolve();               
                }
             });
        }
    });
});

exports.getClientData = (userId, env) => new Promise(function(resolve, reject) {
    let db = new sqlite3.Database(dbPath, (error) => {
        if (error) {
            reject(error);
        }
        else {
            log.info("[DB] Querying token for user_id '" + userId + "', environment '" + env + "'.");

            var tokenData = {};
        
            db.get("SELECT DISTINCT user_id, user_env, api_token, refresh_token, expires_at_utc FROM tokens WHERE user_id = ? AND user_env = ?", [userId, env], function(error, row) {
                if (error) {                    
                    if (error.message.toString().toLowerCase().includes("no such table")) {
                        log.info("[DB] Main table is missing, setting up database again (probably deleted to trigger this).");
                        exports.setupDatabase();
                    }

                    db.close();
                    reject(error);
                }
                else {
                    if (row) {
                        tokenData.access_token = row.api_token;
                        tokenData.token_type = "Bearer";
                        tokenData.refresh_token = row.refresh_token;
                        tokenData.expires_in = 3600;
                        tokenData.expires_at_utc = new Date(row.expires_at_utc);
                        log.info("[DB] Object set from database: " + JSON.stringify(tokenData));

                        db.close();
                        resolve(tokenData);
                    }
                    else {
                        log.info("[DB] No data in db for userId '" + userId + "'.");

                        db.close();
                        reject("No data.");
                    }
                }
            });
        }
    });
});
