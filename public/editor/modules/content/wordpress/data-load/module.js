import vcCake from 'vc-cake'

const TimeMachine = vcCake.getService('time-machine')
const assetsManager = vcCake.getService('assets-manager')
vcCake.add('content-wordpress-data-load', (api) => {
  api.reply('start', () => {
    api.request('wordpress:load')
  })

  api.reply('wordpress:data:loaded', (data) => {
    let dataObject
    let { status, request } = data

    if (status === 'success') {
      dataObject = JSON.parse(request.responseText || '{}')
      if (dataObject.elements) {
        // Todo fix saving ( empty Name, params all undefined toJS function)
        TimeMachine.setZeroState(dataObject.elements)
        api.request('data:reset', dataObject.elements)
      }
      if (dataObject.globalElements && dataObject.globalElements.length) {
        let globalElements = JSON.parse(dataObject.globalElements || '{}')
        globalElements && assetsManager.set(globalElements)
      }
    } else {
      throw new Error('Failed to load wordpress:data:loaded')
    }
    api.request('wordpress:data:added', true)
  })
})
