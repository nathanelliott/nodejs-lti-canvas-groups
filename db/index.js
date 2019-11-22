'use strict';

const sqlite3 = require('sqlite3').verbose();
const dbPath = './db/token.db';

exports.setupDatabase = () => new Promise(async function(resolve, reject) {
    let db = new sqlite3.Database(dbPath, (error) => {
        if (error) {
            console.error(error.message);

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
            resolve();        
        }
    });
});

exports.setClientData = (userId, env, token, refresh, expires) => new Promise(function(resolve, reject) {
    let db = new sqlite3.Database(dbPath, (error) => {
        if (error) {
            console.error(error.message);
            reject();
        }
        else {
            console.log("INSERT OR REPLACE INTO tokens (user_id, user_env, api_token, refresh_token, expires_at_utc) VALUES (" + userId + ", " + env + ", " + token + ", " + refresh + ", " + expires + ")");

            db.run("INSERT OR REPLACE INTO tokens (user_id, user_env, api_token, refresh_token, expires_at_utc) VALUES (?, ?, ?, ?, ?)", [userId, env, token, refresh, expires], function(error) {
                if (error) {
                    console.error(error);
        
                    db.close();
                    reject();
                }
                else {
                    console.log("Replaced token data for user_id '" + userId + "'");

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
            console.error(error.message);
            reject();
        }
        else {
            console.log("(DB) Query db for tokens for user_id '" + userId + "', env '" + env + "'");

            var tokenData = {};
        
            db.get("SELECT DISTINCT user_id, user_env, api_token, refresh_token, expires_at_utc FROM tokens WHERE user_id = ? AND user_env = ?", [userId, env], function(error, row) {
                if (error) {
                    console.error(error);

                    db.close();
                    reject(error);
                }
                else {
                    if (row) {
                        tokenData.access_token = row.api_token;
                        tokenData.token_type = "Bearer";
                        tokenData.refresh_token = row.refresh_token;
                        tokenData.expires_in = 3600;
                        tokenData.expires_at_utc = new Date(Date.parse(row.expires_at_utc));
                        console.log("(DB) Read data from DB: " + JSON.stringify(tokenData));

                        db.close();
                        resolve(tokenData);
                    }
                    else {
                        console.log("(DB) No data in db for userId '" + userId + "'");

                        db.close();
                        reject("No data.");
                    }
                }
            });
        }
    });
});
