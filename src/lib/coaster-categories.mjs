import products from './products.json' with { type: 'json' };

// Examples share the catalog's title and image; there is no separate preview asset.
function catalogExample(slug, subject, brief) {
  const product = products.find(product => product.slug === `sottobicchiere-${slug}` && product.kind === 'coaster');
  if (!product) throw new Error(`Missing catalog example: ${slug}`);
  return { title: product.name, image: product.image, productSlug: product.slug, brief: brief || `Scrivi esattamente “${product.name}”. Disegna ${subject}. Lettering grande e leggibile.` };
}

// Shared by the studio and API: category directions never replace the user's brief.
export const coasterCategories = [
  { id: 'meme', label: 'Meme e ironia', description: 'La battuta che capiscono tutti al primo brindisi.', direction: 'Stile meme: lettering espressivo e una scenetta doodle che racconta la battuta, anche con omini stilizzati. Se richiesto, barra la parola originale lasciandola leggibile e affianca la punchline. Evita simboli generici scollegati dalla frase.', examples: [
    catalogExample('brindisi-neo-disoccupato', '', 'Scrivi “Un brindisi al neo-laureato”: lascia “laureato” leggibile e barralo con una singola linea orizzontale. Scrivi “disoccupato” subito sotto, come correzione della sola parola “laureato”. Disegna due omini stilizzati che brindano con bottiglie, uno con il tocco di laurea. Lettering grande e leggibile, nero con pochi accenti rossi. Nessuna cornice o cerchio: il bordo esterno viene aggiunto dal software.'),
    catalogExample('laureato-per-sbaglio', 'un tocco di laurea caduto per caso su un diploma'),
  ] },
  { id: 'party', label: 'Brindisi e festa', description: 'Per il tavolo degli amici e una festa da ricordare.', direction: 'Tono festoso e complice, lettering energico e una scena di brindisi coerente con la frase.', examples: [
    catalogExample('110-vodka', 'due bicchierini che brindano'),
    catalogExample('prima-titolo-poi-spritz', 'un tocco di laurea appoggiato su un calice di spritz con una fetta di arancia'),
  ] },
  { id: 'faculty', label: 'Facoltà e futuro', description: 'Una battuta su misura per il nuovo dottore.', direction: 'Personalizza l’ironia alla facoltà o professione indicata, con strumenti del mestiere riconoscibili.', examples: [
    catalogExample('dott-in-teoria', 'uno stetoscopio che abbraccia un piccolo tocco di laurea'),
    catalogExample('dottore-linkedin', 'un omino con il tocco di laurea che consegna un curriculum'),
  ] },
  { id: 'student', label: 'Ansia, tesi e caffè', description: 'Gli anni di studio diventano una battuta condivisa.', direction: 'Ironia affettuosa sulla vita universitaria: fatica, tesi e caffè tradotti in una scena semplice e divertente.', examples: [
    catalogExample('caffe-ansia', 'una tazzina di caffè con occhiaie e un piccolo tocco di laurea'),
    catalogExample('3-anni-in-7', 'una tartaruga con il tocco di laurea che taglia il traguardo'),
  ] },
  { id: 'gaming', label: 'Gaming e nerd', description: 'Per chi ha appena sbloccato il livello successivo.', direction: 'Estetica gaming o informatica, lettering deciso e un soggetto originale legato al traguardo. Evita loghi e personaggi di franchise.', examples: [
    catalogExample('achievement-dottore', 'un trofeo pixel art con un tocco di laurea'),
    catalogExample('game-over-universita', 'un controller con un piccolo tocco di laurea'),
  ] },
  { id: 'personal', label: 'Dediche e ricordi', description: 'Un nome, un grazie, un ricordo da portare a casa.', direction: 'Tono affettuoso e celebrativo, lettering curato e composizione ariosa. Rispetta nomi e dediche; non aggiungere ironia se non richiesta.', examples: [
    catalogExample('mamma-pezzo-carta', 'una mamma che abbraccia il neolaureato con un diploma arrotolato'),
    catalogExample('missione-compiuta', 'un tocco di laurea con una bandierina di traguardo leggermente storta'),
  ] },
  { id: 'free', label: 'Idea libera', description: 'Parti da zero e raccontaci la tua idea.', direction: '', examples: [] },
];

export function getCoasterCategory(id) {
  return coasterCategories.find(category => category.id === id);
}
