var request = require('request');
var querystring = require('querystring');
var stateKey = 'spotify_auth_state';

module.exports = {
    init: function (app, redirectUri, clientId, clientSecret) {
        app.get('/login', function (req, res) {
            var state = generateRandomString(16);
            res.cookie(stateKey, state);

            var scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-public playlist-modify-private';
            res.redirect('https://accounts.spotify.com/authorize?' +
                querystring.stringify({
                    response_type: 'code',
                    client_id: clientId,
                    scope: scope,
                    redirect_uri: redirectUri,
                    state: state
                }));
        });

        app.get('/callback', function (req, res) {
            var code = req.query.code || null;
            var state = req.query.state || null;
            var storedState = req.cookies ? req.cookies[stateKey] : null;

            if (state === null || state !== storedState) {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'state_mismatch'
                    }));
            } else {

                res.clearCookie(stateKey);
                var authOptions = {
                    url: 'https://accounts.spotify.com/api/token',
                    form: {
                        code: code,
                        redirect_uri: redirectUri,
                        grant_type: 'authorization_code'
                    },
                    headers: {
                        'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64'))
                    },
                    json: true
                };

                request.post(authOptions, function (error, response, body) {
                    if (!error && response.statusCode === 200) {

                        var access_token = body.access_token,
                            refresh_token = body.refresh_token;

                        res.redirect('/#/lastfmToSpotify/' +
                            querystring.stringify({
                                access_token: access_token,
                                refresh_token: refresh_token
                            }));
                    } else {
                        res.redirect('/#' +
                            querystring.stringify({
                                error: 'invalid_token'
                            }));
                    }
                });
            }
        });

        app.get('/refresh_token', function (req, res) {
            var refresh_token = req.query.refresh_token;
            var authOptions = {
                url: 'https://accounts.spotify.com/api/token',
                headers: {'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64'))},
                form: {
                    grant_type: 'refresh_token',
                    refresh_token: refresh_token
                },
                json: true
            };

            request.post(authOptions, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    var access_token = body.access_token;
                    res.send({
                        'access_token': access_token
                    });
                }
            });
        });

        generateRandomString = function (length) {
            var text = '';
            var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

            for (var i = 0; i < length; i++) {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return text;
        };
    }
};