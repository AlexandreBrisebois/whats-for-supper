# Flow: GOTO Recipe Lifecycle

Go-Tos are the household’s configured fallback recipes. Membership is distinct from rating, Discovery eligibility and readiness. `GoToService` owns the persisted list and ready active choice; filtering does not assign a meal.

## Membership and filters

Users add or remove membership through recipe-detail stars. The star and Go-To label remain visible in both states; selected membership has pressed semantics. Saving disables the control and reports success or failure. Removing membership keeps the recipe.

Browse offers an immediate Star filter directly after its single All/Discovery toggle in the same toolbar. It intersects Discovery and retains cards/list and collection navigation. Search keeps Go-To within Filters, with ordinary draft, Apply, Clear and dismissal behavior. Separate Go-To management, pending-management rows and Add a Go-To acquisition are retired; Settings does not host them.

Confirmed local membership changes refresh an applied-Go-To collection from page one while retaining Browse mode or Search context. If retrieval fails after a successful save, Retry reads again without repeating the save. Rejected saves retain confirmed membership.

Browse recovers height by removing the extra Filters row first. Preserve current preferred stack/card size and image area on the normal phone; adapt only when less space is available. The 390×844 CSS px comparison reference is provisional, not a claim about the user’s phone.

## Capture compatibility

Ordinary recipe capture remains available. Fresh legacy `/capture?intent=goto&mode=describe|photo` entries use ordinary capture in that mode without automatic starring. An already submitted legacy capture can finish its accepted pending registration and ready transition. Its localized Done action explicitly returns to Home without replaying acquisition/list saves, clearing saved membership or interrupting background work and ready notifications.

Legacy `/browse-all-stack?gotoOnly=true&manageGoto=true` honors the filter and ignores the retired management flag. It opens no management sheet. An empty collection offers clearing; pending records are not deleted or presented as ready recipes.

## Tonight

Home’s unplanned pivot uses the existing planner day-specific Search flow with authoritative today selected, week zero and its reference week. Selection, cancellation, planner success return and occupied-slot recovery keep their existing meanings. Opening Search does not assign a meal. Saved Mystery retains its existing Quick Find alternative; planned and other non-cooking states retain their own controls.

The settled ordinary empty pivot uses a larger local fork-and-knife illustration, primary Search, secondary Take Out and a short helper containing the recipe Star icon. No Choose GOTO recipes link appears. Take Out records a non-cooking plan and places no food order. Ready Go-To suggestions retain their photo and Make this tonight; checking/pending feedback remains truthful. Shared recipe-image fallbacks are not enlarged.

## Server semantics

GET `/api/recipes?gotoOnly=true` intersects configured membership with existing eligibility before count/paging. Search’s `filters.gotoOnly` applies before retrieval limits and intersects text, Focus, Similar and other filters. Empty membership yields no ordinary fallback. Ranked continuation keeps its frozen sequence while rechecking membership; newly added recipes require a fresh search. This UI revision changes no backend contract or stored data.
