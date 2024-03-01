let lastFetchedData = null;
$('form').on('submit',async function(event) {
    event.preventDefault();
    let rangeFrom = $('#rangeFrom').val();
    let rangeTo = $('#rangeTo').val();

    let minValue = parseFloat(rangeFrom) || 0; // Parse as float, default to 0 if empty
    let maxValue = parseFloat(rangeTo) || Infinity; // Parse as float, default to Infinity if empty
    if (minValue < 0 || maxValue < 0) {
        alert("Price Range value cannot be negative! Please try a value greater than or equal to 0.0");
        event.preventDefault();
    }
    else if (minValue > maxValue) {
        alert("Oops! Lower price limit cannot be greater than upper price limit! Please try again.");
        event.preventDefault();
    }

    let keyword = $('#keyword').val();

    let conditions = [];
    $('input[name="condition"]:checked').each(function() {
        conditions.push($(this).val());
    });

    let sellers = [];
    $('input[name="seller"]:checked').each(function() {
        sellers.push($(this).val());
    });

    let shipping = [];
    $('input[name="shipping"]:checked').each(function() {
        shipping.push($(this).val());
    });

    let sort = $('#sortBy').val();

    console.log("Conditions: " + conditions);
    console.log("Sellers: " + sellers);
    console.log("Shipping: " + shipping);
    console.log("Sort: " + sort);

    let params = {
        keyword:keyword,
        entriesPerPage:20
    }

    if (minValue != 0) {
        params.minValue = minValue;
    }
    if (maxValue != Infinity) {
        params.maxValue = maxValue;
    }
    if (conditions.length != 0) {
        params.conditions = conditions;
    }
    if (sellers.length != 0) {
        params.sellers = sellers;
    }
    if (shipping.length != 0) {
        params.shipping = shipping;
    }
    if (sort != "Best Match") {
        params.sort = sort;
    }

    let url='/getebaydata?' + new URLSearchParams(params);

    await fetch(url)
    .then((res)=>{
    return res.json();
    })
    .then((data)=>{
    console.log(data);
    lastFetchedData = data;
    ebayTableDisplay(data);
    })
});

function ebayTableDisplay(data){
    // Clear the form section
    $(".resultsSection").empty();
    // Display the headline
    let totalResults = data.findItemsAdvancedResponse[0].paginationOutput[0].totalEntries[0];

    if(totalResults === "0") {
        $(".resultsSection").append(`<h2 class = "nores">No Results Found </h2>`);
        return;
    }

    let keyword = $('#keyword').val();
    $(".resultsSection").append(`<h2>${totalResults} Results Found for <i>${keyword}</i></h2><hr class="result_hr">`);

    // Display the items
    let items = data.findItemsAdvancedResponse[0].searchResult[0].item;
    items.forEach((item, index) => {
        // Extract attributes from item
        let imageUrl = item.galleryURL[0];
        let title = item.title[0];
        let category = item.primaryCategory[0].categoryName[0];
        let condition = item.condition[0].conditionDisplayName[0];
        let price = item.sellingStatus[0].convertedCurrentPrice[0].__value__ ;
        // let shippingCost = item.shippingInfo[0].shippingServiceCost[0];
        let shippingCost = item.shippingInfo[0];
        console.log(shippingCost);
        if(shippingCost === undefined){
            shippingCost = 0;
        }
        else{
            if(shippingCost.shippingServiceCost === undefined){
                shippingCost = 0;
            }
            else{
                shippingCost = shippingCost.shippingServiceCost[0].__value__;
            }
        }
        let shippingPhrase = (shippingCost && parseFloat(shippingCost) >= 0.01) ? `(+ $${shippingCost} for shipping)` : '';
        let topRated = item.topRatedListing[0] === "true";
        let itemId = item.itemId[0];
        let itemUrl = item.viewItemURL[0];

        // Check if any attribute is empty
        if(imageUrl && title && category && condition && price) {
            let itemHtml = `
            <div class="item" ${index >= 3 ? 'style="display: none;"' : ''} data-item-id="${itemId}">
            <div class="item-image">
            <img src="${imageUrl === "https://thumbs1.ebaystatic.com/pict/04040_0.jpg" ? "/path/to/default/image.jpg" : imageUrl}" alt="${title}">
            </div>
                
                <div class="item-details">
                    <h3>${title}</h3>
                    <p>Category: <i>${category} <a href=${itemUrl} target="_blank"><img  src = "/static/images/redirect.png" class="redirect_img"></a></i></p>
                    <p>Condition: ${condition} ${topRated ? '<img src="/static/images/topRatedImage.png" alt="Top Rated" class="top_rated_img">' : ''}</p>
                    <p>Price: $${price} ${shippingPhrase}</p>
                </div>
            </div>`;

            $(".resultsSection").append(itemHtml);
        }
        $(".item:last").on("click", async function() {
            let clickedItemId = $(this).data("item-id");
            console.log("Item clicked with ID:", clickedItemId);
            let url='/singledata?id=' + clickedItemId;
            await fetch(url)
            .then((res)=>{
                return res.json();
            })
            .then((data)=>{
                console.log(data);
                displayDetailedItem(data);
                // eventDetailsDisplay(data);
            })
        });
        $(".item:last .redirect_img").on("click", function(event) {
            event.stopPropagation();
        });
    });


    // Add Show More/Less Button if necessary
    if(items.length > 3) {
        $(".resultsSection").append('<button id="showMoreLess">Show More</button>');
        $("#showMoreLess").on("click", function() {
            if($(this).text() === "Show More") {
                $(".item").slice(0, 10).show();
                $(this).text("Show Less");
                $('html, body').scrollTop($(document).height());
            } else {
                $(".item").slice(3).hide();
                $(this).text("Show More");
                $('html, body').scrollTop(0);
            }
        });
    }

}

function displayDetailedItem(data){
    // Clear the results section
    $(".resultsSection").empty();

    let item = data.Item;
    let imageUrl = item.PictureURL[0];
    let title = item.Title;
    let subTitle = item.Subtitle || "";  // handling possible missing data
    let price = item.CurrentPrice.Value;
    let location = `${item.Location}, ${item.PostalCode}`;
    let seller = item.Seller.UserID;
    let returnPolicy = `${item.ReturnPolicy.ReturnsAccepted} ${item.ReturnPolicy.ReturnsWithin}` ;
    
    // Dynamically construct the table with the provided data
    let tableHtml = `
    <h1 class="item_detail">Item Details</h1>
    <button id="backToSearch" class="button-space">Back to search results</button>
        <div class="detail-table">
            <div class="detail-row">
                <div class="detail-key">Photo</div>
                <div class="detail-value"><img src="${imageUrl}" class="detail-image" alt="${title}" /></div>
            </div>
            <div class="detail-row">
                <div class="detail-key">eBay Link</div>
                <div class="detail-value">
                <a href="${item.ViewItemURLForNaturalSearch}" target="_blank"> eBay Product Link </a>
                </div>
            </div>
            <!-- Add other rows in a similar fashion -->
            <div class="detail-row">
                <div class="detail-key">Title</div>
                <div class="detail-value">${title}</div>
            </div>`
            if (item.Subtitle) {
                tableHtml += `
                <div class="detail-row">
                    <div class="detail-key">SubTitle</div>
                    <div class="detail-value">${item.Subtitle}</div>
                </div>
                `;
            }
            tableHtml += `
            <div class="detail-row">
                <div class="detail-key">Price</div>
                <div class="detail-value">$${price}</div>
            </div>
            <div class="detail-row">
                <div class="detail-key">Location</div>
                <div class="detail-value">${location}</div>
            </div>
            <div class="detail-row">
                <div class="detail-key">Seller</div>
                <div class="detail-value">${seller}</div>
            </div>
            <div class="detail-row">
                <div class="detail-key">Return Policy (US)</div>
                <div class="detail-value">${returnPolicy}</div>
            </div>
            <!-- Dynamically adding item specifics -->
            ${(item.ItemSpecifics && item.ItemSpecifics.NameValueList) ? item.ItemSpecifics.NameValueList.map(specific => `
                <div class="detail-row">
                    <div class="detail-key">${specific.Name}</div>
                    <div class="detail-value">${specific.Value[0]}</div>
                </div>
            `).join('') : ''}
        </div>
    `;

    $(".resultsSection").append(tableHtml);

    $(document).on("click", "#backToSearch", function() {
        ebayTableDisplay(lastFetchedData); // Assuming `lastFetchedData` contains the last search results data
    });
}

$('.clear').on('click', function(e) {
    e.preventDefault();
    $('form')[0].reset();
    $(".resultsSection").html('');

});