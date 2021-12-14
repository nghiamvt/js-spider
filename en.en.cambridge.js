class enen_Cambridge {
  constructor(options) {
    this.options = options;
    this.maxexample = 2;
    this.word = '';
  }

  async displayName() {
    return 'Cambridge English Dictionary';
  }

  setOptions(options) {
    this.options = options;
    this.maxexample = options.maxexample;
  }

  async findTerm(word) {
    this.word = word;
    if (!word) return []; // empty notes

    try {
      const parser = new DOMParser();
      const data = await api.fetch(`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`);
      const doc = parser.parseFromString(data, 'text/html');

      let notes = [];

      // parts of speech: noun, adjective...
      const partsOfSpeech = doc.querySelectorAll('.entry .entry-body__el') || [];
      for (const posEntry of partsOfSpeech) {
        notes.push(this.parsePartOfSpeech(posEntry));
      }
  
      return notes;
      
    } catch (err) {
        return [];
    }
  }

  T(node) {
    return (!node) ? '' : node.innerText.trim();
  }

  parseIPA(entry) {
    // IPA US, UK
    let reading = '';
    let readings = entry.querySelectorAll('.pron .ipa');
    if (readings) {
        let reading_us = this.T(readings[1]);
        reading = reading_us ? `/${reading_us}/` : '';
    }

    return reading;
  }

  parseAudios(entry) {
    // sounds, get both us & uk here because we can change default in the extension
    let audios = [];
    audios[0] = entry.querySelector(".uk.dpron-i source");
    audios[0] = audios[0] ? 'https://dictionary.cambridge.org' + audios[0].getAttribute('src') : '';
    audios[1] = entry.querySelector(".us.dpron-i source");
    audios[1] = audios[1] ? 'https://dictionary.cambridge.org' + audios[1].getAttribute('src') : '';

    return audios;
  }

  // a part of speech has many senses (meanings)
  parsePartOfSpeech(posEntry) {
    // final word because search word can be in popular form.
    const headword = this.T(posEntry.querySelector('.headword'));

    let definitions = [];
    let senses = posEntry.querySelectorAll('.pos-body .dsense') || [];
    for (const sense of senses) {
      const senseHeader = this.T(sense.querySelector(' > .dsense_h'));
      const senseBodies = sense.querySelector('.sense-body') || [];
      let senseBlocks = senseBodies.childNodes || [];
      for (const sensblock of senseBlocks) {
        let phrasehead = '';
        let defblocks = [];
        if (sensblock.classList && sensblock.classList.contains('phrase-block')) {
            phrasehead = this.T(sensblock.querySelector('.phrase-title'));
            phrasehead = phrasehead ? `<div class="phrasehead">${phrasehead}</div>` : '';
            defblocks = sensblock.querySelectorAll('.def-block') || [];
        }
        if (sensblock.classList && sensblock.classList.contains('def-block')) {
            defblocks = [sensblock];
        }
        if (defblocks.length <= 0) continue;

        // make definition segement
        for (const defblock of defblocks) {
          let def = this.T(defblock.querySelector('.ddef_h .def'));
          let def_info = this.T(defblock.querySelector('.ddef_h .def-info')); // B1, B2, C1, C2
          if (!def) continue;
          let definition = phrasehead || '';
          definition += def_info ? `<span class='def_info'>${senseHeader}----${def_info.toUpperCase()}</span>` : '';
          definition += def ? `<span class='def'>${def}</span>` : '';

          // make exmaple segement
          let examples = defblock.querySelectorAll('.def-body .examp') || [];
          if (examples.length > 0 && this.maxexample > 0) {
            definition += '<ul class="examples">';
            for (const [index, examp] of examples.entries()) {
              if (index > this.maxexample - 1) break; // to control only 2 example sentence.
              definition += `<li class='example'>${this.T(examp)}</li>`;
            }
            definition += '</ul>';
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
      css: this.renderCSS(),
    };
  }

  renderCSS() {
    return `
      <style>
        div.phrasehead{margin: 2px 0;font-weight: bold;}
        span.star {color: #FFBB00;}
        span.def_info  {text-transform:lowercase; font-size:0.9em; margin-right:5px; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
        span.def {margin-right:3px; padding:0;}
        ul.examples {font-size:0.8em; list-style:square inside; margin:3px 0;padding:5px;background:rgba(13,71,161,0.1); border-radius:5px;}
        li.example  {margin:0; padding:0;}
        span.eng_sent {margin-right:5px;}
      </style>`;
  }
}
