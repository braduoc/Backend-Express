const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const router = express.Router();
const { exec } = require('child_process');

const docentesFilePath = path.join(__dirname, '../data/docentes.json');

// Crear servidor HTTP y configurar socket.io
const server = http.createServer(router);
const io = socketIo(server);

// Función para leer el archivo JSON de docentes
const readDocentesFile = () => {
    if (!fs.existsSync(docentesFilePath)) {
        return [];
    }
    const data = fs.readFileSync(docentesFilePath);
    return JSON.parse(data);
};

// Función para escribir los datos de docentes al archivo JSON
const writeDocentesFile = (docentes) => {
    fs.writeFileSync(docentesFilePath, JSON.stringify(docentes, null, 2), 'utf8');
};

// Registrar asistencia
router.post('/registrar', (req, res) => {
    const { alumnoId } = req.body;
    const docentes = readDocentesFile();
    let alumnoEncontrado = false;
    let alumno = null;

    for (const docente of docentes) {
        for (const curso of docente.cursos) {
            alumno = curso.alumnos.find(a => a.id === alumnoId);
            if (alumno) {
                alumnoEncontrado = true;
                break;
            }
        }
        if (alumnoEncontrado) break;
    }

    if (!alumnoEncontrado) {
        return res.status(404).json({ success: false, message: 'Alumno no encontrado', encontrado: false });
    }

    alumno.status = true;
    io.emit('nuevaAsistencia', { alumnoId });

    res.json({ 
        success: true, 
        message: `Asistencia registrada y estado de presencia actualizado para el alumno ${alumno.nombre}`, 
        encontrado: true,
        alumno: alumno
    });
});

// Configuración de socket.io y escucha del evento nuevaAsistencia
io.on('connection', (socket) => {
    console.log('Cliente conectado');

    socket.on('nuevaAsistencia', ({ alumnoId }) => {
        const docentes = readDocentesFile();
        let alumnoActualizado = false;

        for (const docente of docentes) {
            for (const curso of docente.cursos) {
                const alumno = curso.alumnos.find(a => a.id === alumnoId);
                if (alumno) {
                    alumno.status = true;
                    alumnoActualizado = true;
                    break;
                }
            }
            if (alumnoActualizado) break;
        }

        if (alumnoActualizado) {
            writeDocentesFile(docentes);
        }
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Endpoint para obtener los estudiantes de un curso de un profesor
router.get('/estudiantes/:docenteId/:cursoCodigo', (req, res) => {
    const { docenteId, cursoCodigo } = req.params;
    const docentes = readDocentesFile();
    const docente = docentes.find(d => d.id === docenteId);

    if (!docente) {
        return res.status(404).json({ message: 'Docente no encontrado' });
    }

    const curso = docente.cursos.find(c => c.codigo === cursoCodigo);

    if (!curso) {
        return res.status(404).json({ message: 'Curso no encontrado' });
    }

    res.json(curso.alumnos);
});

// Exportar el servidor junto con el router
module.exports = { router, server };