import { of, fromEvent, from, merge, timer } from 'rxjs'
import { mapTo, switchMap, tap, mergeMap, takeUntil, filter, finalize } from 'rxjs/operators'

// Constants for Cat Requests
const CATS_URL = 'https://placekitten.com/g/{w}/{h}'
const mapCats = response => from(new Promise(resolve => {
  const blob = new window.Blob([response], { type: 'image/png' })
  const reader = new window.FileReader()
  reader.onload = data => resolve(data.target.result)
  reader.readAsDataURL(blob)
}))

// Constants for Meat Requests
const MEATS_URL = 'https://baconipsum.com/api/?type=meat-and-filler'
const mapMeats = response => {
  const parsedData = JSON.parse(response)
  return of(parsedData ? parsedData[0] : '')
}

/*************************
 * Our Operating State
 *************************/
// Which type of data we are requesting
let requestCategory = 'cats'
/*************************/

/**
 * This function will make an AJAX request to the given Url, map the
 *  * JSON parsed repsonse with the provided mapper function, and emit
 * the result onto the returned observable.
 */
const requestData = (url, mapFunc) => {
  const xhr = new window.XMLHttpRequest()
  return from(new Promise((resolve, reject) => {
    // This is generating a random size for a placekitten image
    //   so that we get new cats each request.
    const w = Math.round(Math.random() * 300 + 100)
    const h = Math.round(Math.random() * 300 + 100)
    const targetUrl = url.replace('{w}', w.toString()).replace('{h}', h.toString())
    xhr.addEventListener('load', () => {
      resolve(xhr.response)
    })
    xhr.open('GET', targetUrl)
    if (requestCategory === 'cats') {
      // Our cats urls return binary payloads
      //  so we need to respond as such.
      xhr.responseType = 'arraybuffer'
    }
    xhr.send()
  })).pipe(
    switchMap(() => mapFunc(xhr.response)),
    tap(data => console.log('Request result: ', data))
  )
}

/**
 * This function will begin our polling for the given state, and
 * on the provided interval (defaulting to 5 seconds)
 */
const startPolling = (category, interval = 5000) => {
  const url = category === 'cats' ? CATS_URL : MEATS_URL
  const mapper = category === 'cats' ? mapCats : mapMeats
  return timer(0, interval)
    .pipe(
      switchMap(() => requestData(url, mapper))
    )
}

// Gather our DOM Elements to wire up events
const startButton = document.getElementById('start')
const stopButton = document.getElementById('stop')
const text = document.getElementById('text')
const pollingStatus = document.getElementById('polling-status')
const catsRadio = document.getElementById('catsCheckbox')
const meatsRadio = document.getElementById('meatsCheckbox')
const catImage = document.getElementById('cat')

const catsClick$ = fromEvent(catsRadio, 'click').pipe(mapTo('cats'))
const meatsClick$ = fromEvent(meatsRadio, 'click').pipe(mapTo('meats'))
const stopPolling$ = fromEvent(stopButton, 'click')

const updateDom = result => requestCategory === 'cats' ? (catImage.src = result) : (text.innerHTML = result)

const watchForData = category => startPolling(category, 5000).pipe(
  tap(updateDom),
  takeUntil(
    // stop polling on either button click or change of categories
    merge(
      stopPolling$,
      merge(catsClick$, meatsClick$).pipe(filter(c => c !== category))
    )
  ),
  finalize(() => (pollingStatus.innerHTML = 'Stopped'))
)

// Handle Form Updates
catsClick$.subscribe(category => {
  requestCategory = category
  catImage.style.display = 'block'
  text.style.display = 'none'
})

meatsClick$.subscribe(category => {
  requestCategory = category
  catImage.style.display = 'none'
  text.style.display = 'block'
})

// Start Polling
fromEvent(startButton, 'click').pipe(
  tap(() => (pollingStatus.innerHTML = 'Started')),
  mergeMap(() => watchForData(requestCategory))
).subscribe()
