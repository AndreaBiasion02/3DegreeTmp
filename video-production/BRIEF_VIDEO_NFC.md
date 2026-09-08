# Video NFC — proporzioni corrette

Stato: preparazione del fotogramma di riferimento. Il nuovo filmato non è ancora generato; serve un servizio di generazione video collegato. Il video pubblicato rimane invariato fino alla disponibilità e alla verifica della nuova clip.

## Riferimenti dimensionali

- Coperchio quadrato: **65 × 65 mm**, valore presente in `3DegreeFE/src/modules/products/components/graduation-favor-configurator/index.tsx`, costante `capSizeMm`.
- Telefono generico assunto per la scena: **160 × 75 mm**. Non è la misura verificata di uno specifico modello commerciale.
- Rapporto lato coperchio / lunghezza telefono: **0,40625**.
- Rapporto lato coperchio / larghezza telefono: **0,86667**. Con il quadrato ruotato, la diagonale proiettata può essere maggiore del lato: confrontare la geometria, non solo il rettangolo dell'immagine.
- Altezza del corpo e diametro: indicativi nel fotogramma generato, da verificare sul CAD se serve accuratezza metrologica completa. Un generatore video non garantisce quote esatte: controllare la stabilità delle proporzioni durante tutta la clip.

## Scena prevista

Formato 16:9, 1920 × 1080 se supportato, 24 fps, circa 8 secondi, senza audio parlato, scritte sovrapposte o loghi del telefono. La bomboniera mantiene il design del video esistente: tocco nero opaco, bordo e alloro rossi, base cilindrica con fascia rossa.

0–2 s: prodotto e telefono interi nello stesso piano di profondità; la bomboniera è chiaramente piccola. 2–5 s: una mano avvicina lentamente la parte posteriore superiore del telefono al coperchio, con movimento continuo e anatomia naturale. 5–6 s: arresto a circa 5–10 mm dal coperchio, senza compenetrazioni. 6–8 s: breve pausa e leggero allontanamento. Camera fissa, ombre coerenti, nessun cambio di scala o trasformazione del prodotto.

## Prompt per il generatore video

Use the supplied corrected-scale photorealistic reference frame as the first frame. Generate one continuous eight-second live-action commercial shot. A natural adult hand slowly brings an ordinary smartphone toward the tiny graduation favor on the linen tabletop. The top rear of the phone approaches the center of the square cap, stops approximately 5–10 millimeters away, holds still briefly, then withdraws slightly. Keep the phone screen facing the viewer naturally while its NFC antenna area on the upper back approaches the lid. Subtle realistic wrist movement, physically coherent grip, five natural fingers. Favor remains stationary on the table throughout.

CRITICAL: maintain constant physical dimensions throughout the entire shot. Favor square lid 65 by 65 millimeters. Smartphone 160 by 75 millimeters. The square lid side is only 40.6 percent of the phone's long side. The favor is a small palm-sized candy box, never a large hat or cake. Same scale and object geometry as the corrected reference at every frame. No product swelling, shrinking, warping, morphing, sliding or levitation. No camera move or dramatic perspective shift. Full product remains visible; the phone does not hide the entire favor. Preserve matte black fine FDM texture, thin red cap outline, red laurel wreath and red ribbon. Warm natural window light, accurate contact shadows and reflections, real skin pores, natural motion blur, cinematic 50mm lens, subtle depth of field. No fake glowing NFC beams, no illegible generated notifications, no text overlays, no watermarks. The interaction illustrates the NFC approach without claiming a working screen recording.

## Controllo prima della sostituzione

Verificare fotogrammi iniziale, avvicinamento, contatto apparente e finale: scala stabile, coperchio riconoscibile, dita corrette, nessuna compenetrazione, illuminazione costante. Esportare MP4 H.264 yuv420p con faststart e poster WebP della nuova clip. Sostituire il video nella vetrina solo dopo questi controlli, aggiornando anche il poster. Non considerare un semplice zoom su un'immagine come il filmato richiesto.
