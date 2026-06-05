$jsPath = 'd:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\js'
$renames = @{
    'loadMoedas' = 'loadCurrencies'
    'loadTransportes' = 'loadTransportations'
    'getMoedas' = 'getCurrencies'
    'getTransportes' = 'getTransportations'
    'displayInnerProgramacaoMessage' = 'displayInnerItineraryMessage'
    'loadInnerProgramacaoMidia' = 'loadInnerItineraryMedia'
    'loadProgramacaoTravelersCheckboxes' = 'loadItineraryTravelersCheckboxes'
    'loadProgramacaoTravelersCheckboxAction' = 'loadItineraryTravelersCheckboxAction'
    'addRemoveTransporteListener' = 'addRemoveTransportationListener'
    'buildGastosObject' = 'buildExpensesObject'
    'setViagem' = 'setTripData'
    'addTransporte' = 'addTransportation'
    'loadDadosBasicosViagemData' = 'loadBasicTripData'
    'loadTransportesData' = 'loadTransportationData'
    'loadHospedagemData' = 'loadAccommodationData'
    'loadProgramacaoData' = 'loadItineraryData'
    'transporteAdicionarListenerAction' = 'transportationAddListenerAction'
    'getProgramacaoArray' = 'getItineraryArray'
    'applyLoadedProgramacaoData' = 'applyLoadedItineraryData'
    'updateProgramacaoTitle' = 'updateItineraryTitle'
    'getDestinationProgramacaoTitle' = 'getDestinationItineraryTitle'
    'getProgramacaoTitleSelectOptions' = 'getItineraryTitleSelectOptions'
    'updateProgramacaoTitleSelect' = 'updateItineraryTitleSelect'
    'getProgramacaoTitle' = 'getItineraryTitle'
    'reloadProgramacao' = 'reloadItinerary'
    'loadProgramacaoListeners' = 'loadItineraryListeners'
    'openInnerProgramacao' = 'openInnerItinerary'
    'getInnerProgramacaoSelect' = 'getInnerItinerarySelect'
    'loadInnerProgramacaoCurrentData' = 'loadInnerItineraryCurrentData'
    'openInnerProgramacaoItem' = 'openInnerItineraryItem'
    'openInnerProgramacaoTroca' = 'openInnerItinerarySwap'
    'afterDragInnerProgramacao' = 'afterDragInnerItinerary'
    '_loadGastos' = 'loadExpenses'
    '_loadDestinos' = 'loadDestinations'
}

Get-ChildItem -Path $jsPath -Recurse -Filter '*.js' | ForEach-Object {
    $c = Get-Content $_.FullName -Raw
    $o = $c
    foreach ($old in $renames.Keys) {
        $new = $renames[$old]
        $c = $c -replace "\b$old\b", $new
    }
    if ($c -ne $o) {
        Set-Content $_.FullName -Value $c -NoNewline
        Write-Host "Fixed: $($_.Name)"
    }
}
Write-Host 'Done'
