// Shared by the studio and API: category directions never replace the user's brief.
export const coasterCategories = [
  { id: 'meme', label: 'Meme e ironia', description: 'La battuta che capiscono tutti al primo brindisi.', direction: 'Stile meme: lettering espressivo e una scenetta doodle che racconta la battuta, anche con omini stilizzati. Se richiesto, barra la parola originale lasciandola leggibile e affianca la punchline. Evita simboli generici scollegati dalla frase.', examples: [
    { title: 'Neo-disoccupato', image: '/coaster-inspiration/generated/neo-disoccupato.webp', brief: 'Scrivi “Un brindisi al neo-laureato”, barra solo “laureato” e aggiungi “disoccupato”. Disegna due omini stilizzati che brindano con due bottiglie, come un meme disegnato a mano.' },
    { title: 'Riqualificazione', image: '/coaster-inspiration/generated/riqualificazione.webp', brief: 'Scrivi “Morto di riqualificazione” con lettering enorme. Disegna una gru da cantiere sopra uno skyline di palazzi: un meme per una laurea in urbanistica.' },
  ] },
  { id: 'party', label: 'Brindisi e festa', description: 'Per il tavolo degli amici e una festa da ricordare.', direction: 'Tono festoso e complice, lettering energico e una scena di brindisi coerente con la frase.', examples: [
    { title: '110 e vodka', image: '/coaster-inspiration/generated/110-vodka.webp', brief: 'Scrivi “110 e vodka”. Disegna due bicchierini che brindano, lettering grande e giocoso per una festa di laurea.' },
    { title: 'Prima il titolo', image: '/coaster-inspiration/generated/prima-il-titolo.webp', brief: 'Scrivi “Prima il titolo, poi lo spritz”. Disegna un tocco di laurea appoggiato su un calice di spritz con una fetta di arancia.' },
  ] },
  { id: 'faculty', label: 'Facoltà e futuro', description: 'Una battuta su misura per il nuovo dottore.', direction: 'Personalizza l’ironia alla facoltà o professione indicata, con strumenti del mestiere riconoscibili.', examples: [
    { title: 'Dottore, in teoria', image: '/coaster-inspiration/generated/dottore-in-teoria.webp', brief: 'Scrivi “Dottore, in teoria”. Per una laurea in medicina, disegna uno stetoscopio che abbraccia la frase.' },
    { title: 'Il primo curriculum', image: '/coaster-inspiration/generated/primo-curriculum.webp', brief: 'Scrivi “Dottore su LinkedIn”. Disegna un omino con il tocco di laurea che consegna un curriculum, con ironia sul primo lavoro.' },
  ] },
  { id: 'student', label: 'Ansia, tesi e caffè', description: 'Gli anni di studio diventano una battuta condivisa.', direction: 'Ironia affettuosa sulla vita universitaria: fatica, tesi e caffè tradotti in una scena semplice e divertente.', examples: [
    { title: 'Caffè e ansia', image: '/coaster-inspiration/generated/caffe-e-ansia.webp', brief: 'Scrivi “Caffè, ansia e laurea”. Disegna una tazzina di caffè con occhiaie e un piccolo tocco di laurea.' },
    { title: 'Fuori corso', image: '/coaster-inspiration/generated/fuori-corso.webp', brief: 'Scrivi “3 anni in 7”. Disegna una tartaruga con il tocco di laurea che taglia il traguardo.' },
  ] },
  { id: 'gaming', label: 'Gaming e nerd', description: 'Per chi ha appena sbloccato il livello successivo.', direction: 'Estetica gaming o informatica, lettering deciso e un soggetto originale legato al traguardo. Evita loghi e personaggi di franchise.', examples: [
    { title: 'Achievement sbloccato', image: '/coaster-inspiration/generated/achievement.webp', brief: 'Scrivi “Achievement: dottore”. Disegna un trofeo pixel art con un tocco di laurea, come una ricompensa di un videogioco.' },
    { title: 'Game over università', image: '/coaster-inspiration/generated/game-over.webp', brief: 'Scrivi “Game over, università”. Disegna un controller con un piccolo tocco di laurea e usa lettering ispirato ai videogiochi arcade.' },
  ] },
  { id: 'personal', label: 'Dediche e ricordi', description: 'Un nome, un grazie, un ricordo da portare a casa.', direction: 'Tono affettuoso e celebrativo, lettering curato e composizione ariosa. Rispetta nomi e dediche; non aggiungere ironia se non richiesta.', examples: [
    { title: 'Grazie, mamma', image: '/coaster-inspiration/generated/grazie-mamma.webp', brief: 'Scrivi “Mamma, ce l’ho fatta!”. Disegna un cuore abbracciato da due rami di alloro, con lettering morbido e affettuoso.' },
    { title: 'Missione compiuta', image: '/coaster-inspiration/generated/missione-compiuta.webp', brief: 'Scrivi “Giulia, missione compiuta!”. Disegna un tocco di laurea con un ramo di alloro. Un ricordo elegante da regalare agli invitati.' },
  ] },
  { id: 'free', label: 'Idea libera', description: 'Parti da zero e raccontaci la tua idea.', direction: '', examples: [] },
];

export function getCoasterCategory(id) {
  return coasterCategories.find(category => category.id === id);
}
