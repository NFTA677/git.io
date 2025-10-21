// Catálogo de NFTs (simulado)
const nfts = [
    {
        id: 'nft001',
        name: 'CryptoPunk #7804',
        description: 'Uno de los 9 Alien Punks, con gorra y pipa. Muy raro.',
        image: 'assets/images/cryptopunk7804.png',
        price: '4,200 ETH',
        owner: 'admin',
        history: [
            { date: '2021-03-11', event: 'Minted' },
            { date: '2021-06-20', event: 'Vendido por 2,500 ETH' }
        ]
    },
    {
        id: 'nft002',
        name: 'Bored Ape Yacht Club #8817',
        description: 'Un Bored Ape dorado con sombrero de capitán y ojos de corazón.',
        image: 'assets/images/boredape8817.png',
        price: '1,000 ETH',
        owner: 'user1',
        history: [
            { date: '2021-04-23', event: 'Minted' },
            { date: '2021-09-15', event: 'Vendido por 800 ETH' }
        ]
    },
    {
        id: 'nft003',
        name: 'Art Blocks Curated: Fidenza #725',
        description: 'Una obra generativa de Tyler Hobbs, muy buscada por coleccionistas.',
        image: 'assets/images/fidenza725.png',
        price: '500 ETH',
        owner: 'user2',
        history: [
            { date: '2021-08-01', event: 'Minted' },
            { date: '2021-11-01', event: 'Vendido por 450 ETH' }
        ]
    },
        {
            id: 'nft004',
            name: 'Meebit #12345',
            description: 'Un personaje 3D, estilo voxel, listo para el metaverso.',
            image: 'assets/images/meebit12345.png',
            price: '3 ETH',
            owner: 'user3',
            history: [
                { date: '2021-07-15', event: 'Minted' },
                { date: '2022-02-20', event: 'Vendido por 2.5 ETH' }
            ]
        }
    ];