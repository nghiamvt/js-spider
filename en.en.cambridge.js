class enen_Oxford {
  constructor(options) {
    this.options = options;
    this.maxexample = 2;
    this.word = "";
  }

  async displayName() {
    return "Cambridge English Dictionary";
  }

  setOptions(options) {
    this.options = options;
    this.maxexample = options.maxexample;
  }

  T(node) {
    return !node ? "" : node.innerText.trim();
  }

  parseIPA(entry) {
    // const IPA_UK this.T(entry.querySelectorAll(".pos-header .uk .ipa")[0]); // IPA UK
    return this.T(entry.querySelectorAll(".pos-header .us .ipa")[0]); // IPA US
  }

  parseAudios(entry) {
    // sounds, get both us & uk here because we can change default in the extension
    let audios = [];
    audios[0] = entry.querySelector(".uk.dpron-i source");
    audios[0] = audios[0] ? audios[0].getAttribute("src") : "";
    audios[1] = entry.querySelector(".us.dpron-i source");
    audios[1] = audios[1] ? audios[1].getAttribute("src") : "";

    return audios;
  }

  // a part of speech has many senses (meanings)
  parsePartOfSpeech(posEntry) {
    // final word because search word can be in popular form.
    const headword = this.T(posEntry.querySelector(".headword"));

    let definitions = [];
    let senses = posEntry.querySelectorAll(".pos-body .dsense") || [];
    for (const sense of senses) {
      const guideword = this.T(sense.querySelector(".dsense_h .guideword")).replace(/[()]/g, "");
      const dgram = this.T(sense.querySelector(".gram.dgram")); // [C], [U], [S], [T]
      const word_type = this.T(sense.querySelector(".pos.dsense_pos")); // verb, noun, adj

      const senseBodies = sense.querySelector(".sense-body") || [];
      let senseBlocks = senseBodies.childNodes || [];
      for (const sensblock of senseBlocks) {
        let phrasehead = "";
        let defblocks = [];
        if (sensblock.classList && sensblock.classList.contains("phrase-block")) {
          phrasehead = this.T(sensblock.querySelector(".phrase-title"));
          phrasehead = phrasehead ? `<div class="word">${phrasehead}</div>` : "";
          defblocks = sensblock.querySelectorAll(".def-block") || [];
        }
        if (sensblock.classList && sensblock.classList.contains("def-block")) {
          defblocks = [sensblock];
        }
        if (defblocks.length <= 0) continue;

        // make definition segement
        for (const defblock of defblocks) {
          let def = this.T(defblock.querySelector(".ddef_h .def"));
          if (!def) continue;
          let def_info = this.T(defblock.querySelector(".epp-xref.dxref")); // A1, A2, B1, B2, C1, C2
          let definition = "";
          definition += guideword ? `<span class='def_info'>${guideword}</span>` : "";
          definition += dgram || "";
          definition += word_type ? ` (${word_type}) ` : "";
          definition += phrasehead;
          definition += definition ? "<br />" : "";
          definition += def_info ? `[${def_info}]` : "";
          definition += def ? `<span class='def'> ${def}</span>` : "";

          // make exmaple segement
          let examples = defblock.querySelectorAll(".def-body .examp") || [];
          if (examples.length > 0 && this.maxexample > 0) {
            definition += '<ul class="examples">';
            for (const [index, examp] of examples.entries()) {
              if (index > this.maxexample - 1) break; // to control only 2 example sentence.
              definition += `<li class='example'>${this.T(examp)}</li>`;
            }
            definition += "</ul>";
          }
          definition && definitions.push(definition);
        }
      }
    }

    return {
      expression: headword,
      audios: this.parseAudios(posEntry),
      definitions,
      reading: this.parseIPA(posEntry),
      css: "",
    };
  }

  async findTerm(word) {
    this.word = word;
    if (!word) return []; // empty notes

    try {
      const parser = new DOMParser();
      const data = await api.fetch(`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`);
      const doc = parser.parseFromString(data, "text/html");

      let notes = [];
      const entries = doc.querySelectorAll(".entry .entry-body__el") || [];
      for (const entry of entries) {
        notes.push(this.parsePartOfSpeech(entry));
      }
      return notes;
    } catch (err) {
      return [];
    }
  }
}
