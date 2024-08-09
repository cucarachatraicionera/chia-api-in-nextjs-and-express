// src/controllers/chia.js

const express = require('express');
const { exec } = require('child_process');
const authController = require('./auth');
const router = express.Router();

const chiaDir = '/home/ubuntu/chia-blockchain';  // Ruta a la carpeta chia-blockchain
const chiaCmd = `${chiaDir}/venv/bin/chia`;      // Ruta completa al ejecutable de chia dentro del entorno virtual

// Función para convertir ASCII a hexadecimal
function asciiToHex(str) {
    return Buffer.from(str, 'utf-8').toString('hex');
}

// Función para convertir hexadecimal a ASCII
function hexToAscii(hex) {
    if (hex.startsWith('0x')) {
        hex = hex.slice(2);
    }
    return Buffer.from(hex, 'hex').toString('utf-8');
}


// Inserción de datos anidados
router.post('/insert-nested-data', authController.verifyToken, (req, res) => {
    const { id, data, fee } = req.body;

    if (!id || !data || !fee) {
        return res.status(400).json({ error: 'ID, data y fee son requeridos' });
    }

    const insertData = (data, parentId) => {
        const changelist = Object.keys(data).map(key => {
            const value = data[key];
            if (typeof value === 'object' && !Array.isArray(value)) {
                const nestedId = `${parentId}_${key}`;
                insertData(value, nestedId);
                return { action: 'insert', key: asciiToHex(key), value: asciiToHex(nestedId) };
            } else {
                return { action: 'insert', key: asciiToHex(key), value: asciiToHex(JSON.stringify(value)) };
            }
        });

        const command = `${chiaCmd} rpc data_layer batch_update '{"id":"${parentId}", "changelist":${JSON.stringify(changelist)}, "fee":"${fee}"}'`;
        
        console.log(`Ejecutando comando: ${command}`);  // Registro de depuración

        exec(command, { cwd: chiaDir }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error ejecutando el comando: ${error.message}`);
                return res.status(500).json({
                    error: `Error ejecutando el comando: ${error.message}`,
                    details: stderr,
                    suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
                });
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return res.status(500).json({
                    error: 'Error en la ejecución del comando',
                    details: stderr
                });
            }
            console.log(`stdout: ${stdout}`);
        });
    };

    insertData(data, id);

    res.json({
        message: 'Datos anidados insertados exitosamente'
    });
});

// Función para realizar una consulta anidada
const fetchDataRecursively = (id, callback) => {
    const command = `${chiaCmd} rpc data_layer get_keys_values '{"id":"${id}"}'`;

    exec(command, { cwd: chiaDir }, (error, stdout, stderr) => {
        if (error) {
            return callback(error, null);
        }
        if (stderr) {
            return callback(new Error(stderr), null);
        }

        let output = JSON.parse(stdout);
        let data = {};

        if (output.success && output.keys_values) {
            let remaining = output.keys_values.length;

            output.keys_values.forEach(item => {
                const key = hexToAscii(item.key);
                const value = hexToAscii(item.value);

                if (value.startsWith(id)) {
                    // Si el valor es un ID anidado, obtener datos recursivamente
                    fetchDataRecursively(value, (err, nestedData) => {
                        if (err) {
                            return callback(err, null);
                        }
                        data[key] = nestedData;
                        remaining -= 1;
                        if (remaining === 0) {
                            callback(null, data);
                        }
                    });
                } else {
                    // Si el valor es un dato normal
                    data[key] = JSON.parse(value);
                    remaining -= 1;
                    if (remaining === 0) {
                        callback(null, data);
                    }
                }
            });
        } else {
            callback(null, data);
        }
    });
};

// Consulta anidada de un Data Store específico
router.get('/get-nested-data', authController.verifyToken, (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'ID es requerido' });
    }

    fetchDataRecursively(id, (error, data) => {
        if (error) {
            return res.status(500).json({
                error: 'Error al obtener datos anidados',
                detalles: error.message
            });
        }
        res.json({
            message: 'Datos anidados obtenidos exitosamente',
            output: data
        });
    });
});


// Crear Data Store
router.post('/create-data-store', authController.verifyToken, (req, res) => {
    const { fee } = req.body;

    if (!fee) {
        return res.status(400).json({ error: 'Fee es requerido' });
    }

    const command = `${chiaCmd} data create_data_store -m ${fee}`;

    exec(command, { cwd: chiaDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el comando: ${error.message}`);
            return res.status(500).json({
                error: `Error ejecutando el comando: ${error.message}`,
                details: stderr,
                suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
            });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }
        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Data Store creado exitosamente',
            output: stdout
        });
    });
});

// Actualizar Data Store
router.post('/update-data-store', authController.verifyToken, (req, res) => {
    const { id, actions } = req.body;

    if (!id || !actions) {
        return res.status(400).json({ error: 'ID y acciones son requeridos' });
    }

    const changelist = Object.keys(actions).map(key => ({
        action: 'insert',
        key: asciiToHex(key), // Convertir key de ASCII a hexadecimal
        value: Buffer.from(actions[key], 'utf-8').toString('hex') // Convertir value a hexadecimal
    }));

    const command = `${chiaCmd} data update_data_store --id=${id} -d '${JSON.stringify(changelist)}'`;

    exec(command, { cwd: chiaDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el comando: ${error.message}`);
            return res.status(500).json({
                error: `Error ejecutando el comando: ${error.message}`,
                details: stderr,
                suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
            });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }
        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Data Store actualizado exitosamente',
            output: stdout
        });
    });
});

// Consultar Data Store
router.get('/get-data-store', authController.verifyToken, (req, res) => {
    const { id, key } = req.query;

    if (!id || !key) {
        return res.status(400).json({ error: 'ID y key son requeridos' });
    }

    const command = `${chiaCmd} data get_value --id=${id} --key=${asciiToHex(key)}`; // Convertir key de ASCII a hexadecimal

    exec(command, { cwd: chiaDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el comando: ${error.message}`);
            return res.status(500).json({
                error: `Error ejecutando el comando: ${error.message}`,
                details: stderr,
                suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
            });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }

        // Convertir la salida JSON y el valor de hexadecimal a ASCII
        let output = JSON.parse(stdout);
        if (output.success && output.value) {
            output.value = hexToAscii(output.value);
        }

        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Consulta realizada exitosamente',
            output: output
        });
    });
});

// Obtener información del Data Store
router.get('/get-data-store-info', authController.verifyToken, (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'ID es requerido' });
    }

    const command = `${chiaCmd} data get_keys_values --id=${id}`;

    exec(command, { cwd: chiaDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el comando: ${error.message}`);
            return res.status(500).json({
                error: `Error ejecutando el comando: ${error.message}`,
                details: stderr,
                suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
            });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }

        // Convertir la salida JSON
        let output = JSON.parse(stdout);
        output.keys_values = output.keys_values.map(item => ({
            ...item,
            key: hexToAscii(item.key), // Convertir key de hexadecimal a ASCII
            value: hexToAscii(item.value) // Convertir value de hexadecimal a ASCII
        }));

        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Información del Data Store obtenida exitosamente',
            output: output
        });
    });
});

// Eliminar Data Store
router.delete('/delete-data-store', authController.verifyToken, (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'ID es requerido' });
    }

    const command = `${chiaCmd} data delete_data_store --id=${id}`;

    exec(command, { cwd: chiaDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el comando: ${error.message}`);
            return res.status(500).json({
                error: `Error ejecutando el comando: ${error.message}`,
                details: stderr,
                suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
            });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }
        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Data Store eliminado exitosamente',
            output: stdout
        });
    });
});

// Listar datos de un Data Store específico
router.get('/list-data-store-keys', authController.verifyToken, (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'ID es requerido' });
    }

    const command = `${chiaCmd} rpc data_layer get_keys_values '{"id":"${id}"}'`;

    exec(command, { cwd: chiaDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el comando: ${error.message}`);
            return res.status(500).json({
                error: `Error ejecutando el comando: ${error.message}`,
                details: stderr,
                suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
            });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }

        // Convertir la salida JSON y los valores de hexadecimal a ASCII
        let output = JSON.parse(stdout);
        if (output.success && output.keys_values) {
            output.keys_values = output.keys_values.map(item => ({
                ...item,
                key: hexToAscii(item.key), // Convertir key de hexadecimal a ASCII
                value: hexToAscii(item.value) // Convertir value de hexadecimal a ASCII
            }));
        }

        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Datos del Data Store obtenidos exitosamente',
            output: output
        });
    });
});

// Eliminar clave específica en el Data Store
router.post('/delete-data-store-key', authController.verifyToken, (req, res) => {
    const { id, key, fee } = req.body;

    if (!id || !key || !fee) {
        return res.status(400).json({ error: 'ID, key y fee son requeridos' });
    }

    const command = `${chiaCmd} rpc data_layer delete_key '{"id":"${id}", "key":"${asciiToHex(key)}", "fee":"${fee}"}'`;

    exec(command, { cwd: chiaDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el comando: ${error.message}`);
            return res.status(500).json({
                error: `Error ejecutando el comando: ${error.message}`,
                details: stderr,
                suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
            });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }
        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Clave eliminada exitosamente del Data Store',
            output: stdout
        });
    });
});

// Nueva ruta GET que devuelve "Hola CHIA"
router.get('/hola-chia', authController.verifyToken, (req, res) => {
    res.send('Hola CHIA');
});

module.exports = router;
