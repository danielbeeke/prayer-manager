class HandleStoreClass {

  constructor () {
    this.database = this.init()
  }

  async init () {
    return new Promise((resolve, reject) => {
      const DBOpenRequest = indexedDB.open('handles', 1);

      DBOpenRequest.onupgradeneeded = (event) => {
        if (event.oldVersion === 0) DBOpenRequest.result.createObjectStore('handles', {});
      }

      DBOpenRequest.onerror = () => reject(DBOpenRequest.error)
      DBOpenRequest.onblocked = () => console.log(`IndexedDB open database request was blocked`)
      DBOpenRequest.onsuccess = () => resolve(DBOpenRequest.result)
    });
  }

  async getHandles () {
    const DB = await this.database;

    return new Promise((resolve, reject) => {
      const transaction = DB.transaction(['handles'], 'readonly');
      const objectStore = transaction.objectStore('handles');
      const objectStoreRequest = objectStore.getAll();

      objectStoreRequest.onerror = () => reject(objectStoreRequest.error);
      objectStoreRequest.onsuccess = async () => resolve(objectStoreRequest.result)
    });
  }

  async removeHandle (handle) {
    const DB = await this.database;

    if (!(handle instanceof FileSystemDirectoryHandle)) return new TypeError('Should be instance of FileSystemDirectoryHandle');

    await new Promise((resolve, reject) => {
      const transaction = DB.transaction(['handles'], 'readwrite');
      const objectStore = transaction.objectStore('handles');
      const objectStoreRequest = objectStore.delete(handle.name);
      objectStoreRequest.onsuccess = () => resolve()
      objectStoreRequest.onerror = () => reject(objectStoreRequest.error)
      transaction.commit();
    });
  }

  async storeHandle (handle) {
    const DB = await this.database;

    const handles = await this.getHandles()
    if (handles.find(handle => handle.name === handle.name)) return
    if (!(handle instanceof FileSystemDirectoryHandle)) return new TypeError('Should be instance of FileSystemDirectoryHandle');

    await new Promise((resolve, reject) => {
      const transaction = DB.transaction(['handles'], 'readwrite');
      const objectStore = transaction.objectStore('handles');
      const objectStoreRequest = objectStore.add(handle, handle.name);
      objectStoreRequest.onsuccess = () => resolve()
      objectStoreRequest.onerror = () => reject(objectStoreRequest.error)
      transaction.commit();
    });
  }
}

export const HandleStore = new HandleStoreClass()
