var
    express = require('express'),
    router = express.Router(),
    passport = require('passport'),
    jwt = require('jsonwebtoken'),
    config = require('../config'),
    crypto = require('crypto'),
    sql = require('mssql');

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Devuelve el payload del token JWT si está autenticado
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Ok
 *       401:
 *         description: Unauthorized
 */
router.get('/me', passport.authenticate('jwt', {
        session: false
    }),
    function(req, res) {
        res.json(req.user);
    }
);

/**
 * @swagger
 * /login':
 *   post:
 *     summary: Genera un JWT de autenticación
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: Nombre de usuario
 *         in: body
 *         required: true
 *         type: string
 *       - name: password
 *         description: Nombre de usuario
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Ok
 *       401:
 *         description: Unauthorized
 */
router.post('/login', function(req, res, next) {
    sql.connect(config.sql, function(err) {
        if (err)
            return next(err);
        if (!req.body.username || !req.body.password)
            return next(401);

        new sql.Request()
            .input('username', sql.VarChar(100), req.body.username)
            .input('password', sql.VarChar(100), crypto.createHash('md5').update(req.body.password).digest('hex'))
            .query(config.sqlQueries.getUser, function(err, data) {
                if (err)
                    return next(err);
                if (!data || !data.length)
                    return next(401);

                var variables = {};
                data.forEach(function(i) {
                    var value = isNaN(i.value) ? i.value : Number(i.value);
                    if (i.multipleValues) {
                        if (!variables[i.variable])
                            variables[i.variable] = [];
                        variables[i.variable].push(value);
                    } else {
                        variables[i.variable] = value;
                    }
                });

                var token = jwt.sign({
                    sub: data[0].id,
                    id: data[0].id,
                    name: data[0].name,
                    given_name: data[0].given_name,
                    family_name: data[0].family_name,
                    scope: {
                        variables: variables,
                    }
                }, config.jwt.secret, {
                    expiresIn: 3000000
                });
                res.json({
                    token: token
                });
            })
    });
});

/**
 * @swagger
 * /settings/{name}:
 *   get:
 *     summary: Devuelve el setting almacenado para el usuario autenticado
 *     parameters:
 *       - name: name
 *         description: Nombre del setting
 *         in: path
 *         required: true
 *         type: string
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Ok
 *       401:
 *         description: Unauthorized
 */
router.get('/settings/:name', passport.authenticate('jwt', {
        session: false
    }),
    function(req, res, next) {
        sql.connect(config.sql, function(err) {
            if (err)
                return next(err);

            new sql.Request()
                .input('userId', sql.Int, req.user.sub)
                .input('settingId', sql.VarChar(100), req.params.name)
                .query(config.sqlQueries.getSetting, function(err, data) {
                    if (err)
                        return next(err);
                    if (!data || !data.length)
                        return next(401);

                    res.json({
                        value: data[0].value
                    });
                })
        });
    }
);

/**
 * @swagger
 * /settings/{name}:
 *   post:
 *     summary: Almacena un nuevo valor para el setting del el usuario autenticado
 *     parameters:
 *       - name: name
 *         description: Nombre del setting
 *         in: path
 *         required: true
 *         type: string
 *       - name: value
 *         description: Valor del setting
 *         in: body
 *         required: true
 *         type: string
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Ok
 *       401:
 *         description: Unauthorized
 */
router.post('/settings/:name', passport.authenticate('jwt', {
        session: false
    }),
    function(req, res, next) {
        sql.connect(config.sql, function(err) {
            if (err)
                return next(err);

            new sql.Request()
                .input('userId', sql.Int, req.user.sub)
                .input('settingId', sql.VarChar(100), req.params.name)
                .input('value', sql.VarChar(100), req.body.value)
                .query(config.sqlQueries.setSetting, function(err, data) {
                    if (err)
                        return next(err);

                    res.json({
                        value: req.body.value
                    });
                })
        });
    }
);

module.exports = router;
