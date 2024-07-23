// routes/chiaController.js

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');

const chiaDir = '/home/ubuntu/chia-blockchain';  // Ruta a la carpeta chia-blockchain
const chiaCmd = `${chiaDir}/venv/bin/chia`;      // Ruta completa al ejecutable de chia dentro del entorno virtual

// Crear Data Store
router.post('/create-data-store', (req, res) => {
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
router.post('/update-data-store', (req, res) => {
    const { id, actions } = req.body;

    if (!id || !actions) {
        return res.status(400).json({ error: 'ID y acciones son requeridos' });
    }

    const changelist = Object.keys(actions).map(key => ({
        action: 'insert',
        key,
        value: actions[key]
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
router.get('/get-data-store', (req, res) => {
    const { id, key } = req.query;

    if (!id || !key) {
        return res.status(400).json({ error: 'ID y key son requeridos' });
    }

    const command = `${chiaCmd} data get_value --id=${id} --key=${key}`;

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
            message: 'Consulta realizada exitosamente',
            output: stdout
        });
    });
});

// Obtener información del Data Store
router.get('/get-data-store-info', (req, res) => {
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
            return res.status500.json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }
        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Información del Data Store obtenida exitosamente',
            output: stdout
        });
    });
});

// Eliminar Data Store
router.delete('/delete-data-store', (req, res) => {
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

// Listar Data Stores
router.get('/list-data-stores', (req, res) => {
    const command = `${chiaCmd} data list_data_stores`;

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
            message: 'Lista de Data Stores obtenida exitosamente',
            output: stdout
        });
    });
});

// Nueva ruta GET que devuelve "Hola CHIA"
router.get('/hola-chia', (req, res) => {
    res.send('Hola CHIA');
});

module.exports = router;
