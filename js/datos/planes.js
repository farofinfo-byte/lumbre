// =====================================================================
//  Planes de lectura
//  Cada día es una lista de pasajes (capítulo "JHN.3" o rango "MAT.5.1-MAT.5.16").
//  Para añadir un plan nuevo, copia uno y cambia slug, título y días.
// =====================================================================

const capitulos = (libro, desde, hasta) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => [`${libro}.${desde + i}`]);

export const PLANES = [
  {
    slug: 'juan-21',
    titulo: 'Juan en 21 días',
    descripcion: 'Conoce a Jesús de cerca: quién es, cómo ama y qué promete.',
    colores: ['#1E2D55', '#0E1730'],
    dias: capitulos('JHN', 1, 21),
  },
  {
    slug: 'proverbios-31',
    titulo: 'Proverbios en 31 días',
    descripcion: 'Un capítulo de sabiduría práctica para cada día del mes.',
    colores: ['#6B4A16', '#2C1E08'],
    dias: capitulos('PRO', 1, 31),
  },
  {
    slug: 'salmos-paz-14',
    titulo: 'Salmos para el alma',
    descripcion: 'Catorce salmos para días de ansiedad, cansancio o necesidad de paz.',
    colores: ['#2F5146', '#12241E'],
    dias: [23, 46, 91, 121, 27, 4, 16, 34, 62, 103, 139, 42, 63, 131].map((n) => [`PSA.${n}`]),
  },
  {
    slug: 'orar-7',
    titulo: 'Aprender a orar',
    descripcion: 'Siete días para crecer en tu conversación con Dios.',
    colores: ['#4B2E5A', '#1D1226'],
    dias: [
      ['MAT.6.5-MAT.6.15'],
      ['LUK.11.1-LUK.11.13'],
      ['PSA.62'],
      ['JHN.17'],
      ['PHP.4.4-PHP.4.9'],
      ['EPH.3.14-EPH.3.21'],
      ['LUK.18.1-LUK.18.14'],
    ],
  },
  {
    slug: 'sermon-monte-6',
    titulo: 'El Sermón del Monte',
    descripcion: 'Las palabras de Jesús sobre la vida en su reino, en seis días.',
    colores: ['#5A3A2A', '#22140D'],
    dias: [
      ['MAT.5.1-MAT.5.16'],
      ['MAT.5.17-MAT.5.48'],
      ['MAT.6.1-MAT.6.18'],
      ['MAT.6.19-MAT.6.34'],
      ['MAT.7.1-MAT.7.14'],
      ['MAT.7.15-MAT.7.29'],
    ],
  },
  {
    slug: 'marcos-16',
    titulo: 'Marcos en 16 días',
    descripcion: 'El evangelio más breve y directo: Jesús en acción.',
    colores: ['#2B3F63', '#111B30'],
    dias: capitulos('MRK', 1, 16),
  },
  {
    slug: 'gozo-libertad-10',
    titulo: 'Gozo y libertad',
    descripcion: 'Filipenses y Gálatas: alegría en todo y libertad en Cristo.',
    colores: ['#7A5A1C', '#2E2209'],
    dias: [...capitulos('PHP', 1, 4), ...capitulos('GAL', 1, 6)],
  },
  {
    slug: 'santiago-5',
    titulo: 'Una fe que se nota',
    descripcion: 'Santiago en cinco días: fe que se vive con hechos.',
    colores: ['#3A4F2E', '#151F10'],
    dias: capitulos('JAS', 1, 5),
  },
  {
    slug: '1juan-5',
    titulo: 'Amados: 1 Juan',
    descripcion: 'Cinco días para descansar en el amor de Dios y aprender a amar.',
    colores: ['#6A2F3A', '#271015'],
    dias: capitulos('1JN', 1, 5),
  },
  {
    slug: 'romanos-16',
    titulo: 'Romanos en 16 días',
    descripcion: 'La gracia explicada de principio a fin.',
    colores: ['#243B4F', '#0D1822'],
    dias: capitulos('ROM', 1, 16),
  },
];

export const planPorSlug = (slug) => PLANES.find((p) => p.slug === slug);
