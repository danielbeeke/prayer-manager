import { html, render } from 'uhtml'
import { fa, valueToArray } from './Helpers.js'
import { faFolderOpen, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { HandleStore } from './HandleStore.js';
import { I10n } from './i10n.js';

class App {
  constructor() {
    this.appElement = document.querySelector('#app')
    this.handle = null
    this.selectedFile = null
    this.language = localStorage.getItem('language') ?? 'en'
    this.languages = [
      { code: 'nl', label: 'Nederlands' },
      { code: 'en', label: 'English' },
    ]
    this.languageCodes = this.languages.map(language => language.code)
    this.previousHandles = []
    I10n(this.language, this.languageCodes).then((t) => {
      this.t = t
      HandleStore.getHandles().then(handles => {
        this.previousHandles = handles
        this.draw()
      })

      this.draw()
    })
  }

  async draw () {
    let phase = 'Loading'
    if (this.handle) phase = 'Overview'
    if (this.selectedFile === 'new') phase = 'New'
    if (this.selectedFile && this.selectedFile !== 'new') phase = 'Edit'
    render(this.appElement, await this[`template${phase}`]())
  }


  async languageSwitcher () {
    return html`
      <select onchange="${async event => {
      this.language = event.target.value;
      localStorage.setItem('language', this.language)
      this.t = await I10n(this.language, this.languageCodes)
      await this.draw()
    }}" class="language-switcher">
        ${this.languages.map((language) => {
      return language.code === this.language ? html`
        <option value="${language.code}" selected>${language.label}</option>
        ` : html`
        <option value="${language.code}">${language.label}</option>
      `
    })}
      </select>
    `
  }

  async templateLoading () {
    return html`
      <div class="left">
        <h1 class="site-title">${this.t`Hello mister!`}</h1>
        
        <h3>${this.t`Previously opened directories`}</h3>
        
        ${await this.languageSwitcher()}
        
        ${this.previousHandles.length ? html`<ul class="directory-list">
          ${this.previousHandles.map(handle => html`<li class="directory">
            <span class="title" onclick="${async () => {
              await this.verifyPermission(handle)
              this.handle = handle
              await this.draw()
            }}">${handle.name}</span>
            
            <button class="remove button" onclick=${async () => {
              await HandleStore.removeHandle(handle)
              this.previousHandles = await HandleStore.getHandles()
              await this.draw()
            }}>${fa(faTimes)}</button>
          </li>
        `)}
        </ul>` : ''}
        
        ${this.templateOpenFolder()}
      </div>
    `
  }

  templateOpenFolder () {
    return html`<button onclick=${async () => {
      await this.showFolderDialog()
      await this.draw()
    }}>${this.t`Open folder with prayers`} ${fa(faFolderOpen)}</button>`
  }

  async templateSidebar () {
    const possibleTranslations = ['en', 'nl', 'de']

    const files = [];
    for await (const entry of this.handle.getEntries()) {
      const isJsonLd = entry.name.substr(-7) === '.jsonld'
      if (entry.isFile && isJsonLd) {
        const file = await entry.getFile();
        const jsonLd = JSON.parse(await file.text())

        const contentTranslations = valueToArray(jsonLd['prayer:content']).map(value => value?.['@language']).filter(filter => !!filter)
        const titleTranslations = valueToArray(jsonLd['prayer:title']).map(value => value?.['@language']).filter(filter => !!filter)
        const translations = contentTranslations.filter(value => titleTranslations.includes(value))

        files.push({
          name: entry.name,
          entry: entry,
          translations: translations
        })
      }
    }

    return html`
      <ul class="file-list">
        ${files.map(file => html`<li class="file" onclick=${() => {
          this.selectedFile = file.entry
          this.draw()
        }}>
          <span class="file-name">${file.name.substr(0, file.name.length - 7)}</span>
          ${possibleTranslations.map(langCode => html`<span class="${'language-code' + (file.translations.includes(langCode) ? ' translated' : '')}">${langCode}</span>`)}
        </li>`)}
      </ul>
      <button onclick=${() => {
        this.selectedFile = 'new'
        this.draw()
      }}>${fa(faPlus)}</button>
      
      ${this.templateOpenFolder()}
    `
  }

  async templateOverview () {
    return html`
      <div class="left">
        <h1>${this.handle.name}:</h1>
        ${await this.templateSidebar()}
      </div>
    `
  }

  async templateEdit () {
    const file = await this.selectedFile.getFile();
    const text = await file.text()
    const blob = new Blob([text], {type: 'octet/stream' })
    const blobUrl = window.URL.createObjectURL(blob);

    return html.for(file)`
      <div class="left">
        <h1>${this.handle.name}:</h1>
        ${await this.templateSidebar()}
      </div>
            
      <rdf-form
        class="right"
        data=${blobUrl}
        onsave=${async event => {
          const text = JSON.stringify(event.detail, null, 2)
          const writable = await this.selectedFile.createWritable();
          await writable.write(text);
          await writable.close();
        }}
        form="http://rdf.danielbeeke.nl/prayer/prayer.form.ttl"
        selected-language=${this.language}
        i14n-languages='{"en": "English", "nl": "Nederlands"}'
        ui-languages='{"nl": "Nederlands"}'
        proxy="https://thingproxy.freeboard.io/fetch/">
      </rdf-form>
    `
  }

  async templateNew () {
    return html`
      <h1>New:</h1>
      ${await this.templateSidebar()}
            
      <rdf-form
        class="right"
        onsave=${async event => {
          const text = JSON.stringify(event.detail, null, 2)
          const title = event.detail['prayer:title']
          const fileName = title + '.jsonld'
          const newFileHandle = await this.handle.getFile(fileName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(text);
          await writable.close();
        }}
        form="http://rdf.danielbeeke.nl/prayer/prayer.form.ttl"
        selected-language=${this.language}
        i14n-languages='{"en": "English", "nl": "Nederlands"}'
        ui-languages='{"nl": "Nederlands"}'
        proxy="https://thingproxy.freeboard.io/fetch/">
      </rdf-form>
    `
  }

  /**
   * Shows the OS folder dialog.
   */
  async showFolderDialog () {
    this.handle = await window.chooseFileSystemEntries({
      type: 'open-directory',
      readOnly: false,
    })
    await HandleStore.storeHandle(this.handle)
  }

  /**
   * Checks the permission for the folder.
   * @param fileHandle
   * @returns {Promise<boolean>}
   */
  async verifyPermission(fileHandle) {
    return await fileHandle.queryPermission({ mode: 'readwrite' }) === 'granted' ||
    await fileHandle.requestPermission({ mode: 'readwrite' }) === 'granted'
  }
}

new App()
