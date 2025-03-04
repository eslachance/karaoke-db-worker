const singers = [
  {
    id: 1,
    name: 'John Doe',
    songs: [
      {
        id: 1,
        title: 'Song 1',
        artist: 'Artist 1',
        year: 2024,
        duration: 180,
      } 
    ]
  },
  {
    id: 2,
    name: 'Jane Doe',
    songs: []
  }
];

const singersRoutes = async (fastify) => {
  fastify.get('/list', async () => {
    return singers;
  });

  fastify.post('/new', async (request, reply) => {
    const { name } = request.body;
    if (!name) {
      return reply.code(400).send('Name is required');
    }
    
    const newSinger = {
      id: singers.length + 1,
      name,
      songs: []
    };
    singers.push(newSinger);
    return newSinger;
  });

  fastify.post('/:id/song', async (request, reply) => {
    const { id } = request.params;
    const singer = singers.find(s => s.id === parseInt(id));
    if (!singer) {
      return reply.code(404).send('Singer not found');
    }

    const { title, artist, year, duration } = request.body;
    if (!title || !artist) {
      return reply.code(400).send('Title and artist are required');
    }

    const newSong = {
      id: singer.songs.length + 1,
      title,
      artist,
      year: year || new Date().getFullYear(),
      duration: duration || 0
    };
    
    singer.songs.push(newSong);
    return newSong;
  });

  fastify.get('/first-songs', async () => {
    const firstSongs = singers
      .filter(singer => singer.songs.length > 0)
      .map(singer => ({
        singerId: singer.id,
        singerName: singer.name,
        song: singer.songs[0]
      }))
      .slice(0, 3);
    
    return firstSongs;
  });

  fastify.post('/play-next', async (request, reply) => {
    const singerWithSongs = singers.findIndex(singer => singer.songs.length > 0);
    if (singerWithSongs === -1) {
      return reply.code(404).send('No songs available');
    }

    const playedSong = singers[singerWithSongs].songs.shift();

    if (singers.length === 0) {
      return reply.code(404).send('No singers available');
    }
    
    const firstSinger = singers.shift();
    singers.push(firstSinger);

    return {
      played: playedSong,
      singer: firstSinger.name
    };
  });
};

export default singersRoutes; 
