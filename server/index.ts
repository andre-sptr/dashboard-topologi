import express from 'express';
import cors from 'cors';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all topologies
app.get('/api/topologies', async (req, res) => {
  try {
    const topologies = await prisma.topology.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(topologies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch topologies' });
  }
});

// Get topology with elements
app.get('/api/topologies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const topology = await prisma.topology.findUnique({
      where: { id },
      include: { elements: true },
    });
    if (!topology) return res.status(404).json({ error: 'Topology not found' });
    res.json(topology);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch topology' });
  }
});

// Create new topology with elements
app.post('/api/topologies', async (req, res) => {
  try {
    const { name, elements, viewBox, assets } = req.body;
    const topology = await prisma.topology.create({
      data: {
        name,
        viewBox,
        assets: JSON.stringify(assets || []),
        elements: {
          create: elements.map((el: any) => ({
            type: el.type,
            props: JSON.stringify(el.props),
            x: el.x || 0,
            y: el.y || 0,
            transform: el.transform,
            zIndex: el.zIndex || 0,
          })),
        },
      },
      include: { elements: true },
    });
    res.json(topology);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create topology' });
  }
});

// Update element position
app.patch('/api/elements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y, transform } = req.body;
    const element = await prisma.svgElement.update({
      where: { id },
      data: { x, y, transform },
    });
    res.json(element);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update element' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Keep process alive
setInterval(() => { }, 1000 * 60 * 60);
