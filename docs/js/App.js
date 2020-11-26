import { html, render } from './vendor/uhtml.js'
import { fa, valueToArray } from './Helpers.js'
import { faFolderOpen, faPlus, faTimes } from './vendor/@fortawesome/free-solid-svg-icons.js'
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
    let phase = 'Home'
    if (this.handle) phase = 'Overview'
    if (this.selectedFile === 'new') phase = 'New'
    if (this.selectedFile && this.selectedFile !== 'new') phase = 'Edit'

    document.body.dataset.page = phase

    render(this.appElement, await this[`template${phase}`]())
  }


  async languageSwitcher () {
    return html`
      <select class="language-switcher" onchange="${async event => {
      this.language = event.target.value;
      localStorage.setItem('language', this.language)
      this.t = await I10n(this.language, this.languageCodes)
      await this.draw()
    }}" class="language-switcher">
    ${this.languages.map((language) => html`
      <option value="${language.code}" selected="${language.code === this.language ? true : null}">${language.label}</option>
    `
    )}
      </select>
    `
  }

  async templateHeader () {
    return html`
    <h1 class="site-title">
      ${this.t`Hello mister!`}
      ${await this.languageSwitcher()}
    </h1>
    `
  }

  async templateHome () {
    return html`
      <div class="sidebar">
        ${await this.templateHeader()}

        <div class="catalog">
                  
          ${this.previousHandles.length ? html`
          <h3>${this.t`Previously opened folders`}</h3>
          <ul class="directory-list">
            ${this.previousHandles.map(handle => html`<li class="directory" onclick="${async () => {
              await this.verifyPermission(handle)
              this.handle = handle
              await this.draw()
            }}">
              <span class="title">${handle.name}</span>            
              <button class="remove button" onclick=${async () => {
                await HandleStore.removeHandle(handle)
                this.previousHandles = await HandleStore.getHandles()
                await this.draw()
              }}>${fa(faTimes)}</button>
            </li>
          `)}
          </ul>` : ''}
         
        </div>
        
        <div class="open-new">
          <h3>${this.t`Open a new folder`}</h3>
          ${this.templateOpenFolder()}
        </div>
      </div>
    `
  }

  templateOpenFolder () {
    return html`<button onclick=${async () => {
      await this.showFolderDialog()
      await this.draw()
    }}>${fa(faFolderOpen)} ${this.t`Open folder with prayers`}</button>`
  }

  async templateOpenedFolder () {
    const possibleTranslations = ['en', 'nl']
    const files = await this.getFiles()

    return html`
      <div class="sidebar">
       ${await this.templateHeader()}

        <h3>
          ${this.handle?.name}
          <button onclick=${() => {
            this.handle = null
            this.selectedFile = null
            this.draw()
          }}>${fa(faTimes)}</button>
        </h3>
  
        <ul class="file-list">
          ${files.map(file => html`<li class="${'file ' + (this.selectedFile?.name === file.entry.name ? 'selected' : '')}" onclick=${() => {
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
        }}>${fa(faPlus)} ${this.t`Create a new prayer`}</button>
      </div>
    `
  }

  async templateOverview () {
    return html`
      ${await this.templateOpenedFolder()}
    `
  }

  async templateEdit () {
    const file = await this.selectedFile.getFile();
    const text = await file.text()
    const blob = new Blob([text], {type: 'octet/stream' })
    const blobUrl = window.URL.createObjectURL(blob);

    return html.for(file)`
      ${await this.templateOpenedFolder()}
      <div class="main">
        <rdf-form
          data=${blobUrl}
          onsave=${async event => {
            const text = JSON.stringify(event.detail, null, 2)
            const writable = await this.selectedFile.createWritable();
            await writable.write(text);
            await writable.close();
          }}
          form="https://rdf.danielbeeke.nl/prayer/prayer.form.ttl"
          selected-language=${this.language}
          i10n-languages='{"en": "English", "nl": "Nederlands"}'
          ui-languages='{"nl": "Nederlands"}'
          proxy="https://2i9izrkade.execute-api.eu-central-1.amazonaws.com/dev/?url=">
        </rdf-form>
      </div>
    `
  }

  async templateNew () {
    return html`
      ${await this.templateOpenedFolder()}

      <div class="main">
        <rdf-form
          onsave=${async event => {
            const text = JSON.stringify(event.detail, null, 2)
            const title = event.detail['prayer:title']
            const fileName = title + '.jsonld'
            const newFileHandle = await this.handle.getFileHandle(fileName, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(text);
            await writable.close();
          }}
          form="https://rdf.danielbeeke.nl/prayer/prayer.form.ttl"
          selected-language=${this.language}
          i10n-languages='{"en": "English", "nl": "Nederlands"}'
          ui-languages='{"nl": "Nederlands"}'
          proxy="https://2i9izrkade.execute-api.eu-central-1.amazonaws.com/dev/?url=">
        </rdf-form>

      </div>            
    `
  }

  /**
   * Shows the OS folder dialog.
   */
  async showFolderDialog () {
    this.handle = await window.showDirectoryPicker()
    await HandleStore.storeHandle(this.handle)
  }

  /**
   * Returns a file list from the current handle.
   * @returns {Promise<[]>}
   */
  async getFiles () {
    const files = [];
    if (!this.handle) return files

    for await (const [name, entry] of this.handle.entries()) {
      const isJsonLd = name.substr(-7) === '.jsonld'
      if (entry.kind === 'file' && isJsonLd) {
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
    return files
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
