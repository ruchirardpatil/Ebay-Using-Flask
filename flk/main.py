from flask import Flask,jsonify,request
import requests
from ebay_oauth_token import OAuthToken


app = Flask(__name__)

client_id = "BhavenGo-Assign2-PRD-e7284ce84-24b40984"
client_secret = "PRD-7284ce8492cb-09ac-498e-924b-f55c"
# Create an instance of the OAuthUtility class 
oauth_utility = OAuthToken(client_id, client_secret) 
# Get the application token
application_token = oauth_utility.getApplicationToken()
print(application_token)
@app.route('/')
def MainPage():
    return app.send_static_file("frontend.html")

@app.route('/getebaydata', methods=['GET'])
def get_ebay_data():
    args = request.args.to_dict()

    base_url = "https://svcs.ebay.com/services/search/FindingService/v1"
    params = {
        "OPERATION-NAME": "findItemsAdvanced",
        "SERVICE-VERSION": "1.0.0",
        "SECURITY-APPNAME": "BhavenGo-Assign2-PRD-e7284ce84-24b40984",
        "RESPONSE-DATA-FORMAT": "JSON",
        "REST-PAYLOAD": "",
        "keywords": args["keyword"],
        "paginationInput.entriesPerPage": args["entriesPerPage"],
        "sortOrder": args["sort"]  # Add sort order
    }

    filter_index = 0

    # MinPrice filter
    if "minValue" in args:
        params[f"itemFilter({filter_index}).name"] = "MinPrice"
        params[f"itemFilter({filter_index}).value"] = args["minValue"]
        params[f"itemFilter({filter_index}).paramName"] = "Currency"
        params[f"itemFilter({filter_index}).paramValue"] = "USD"
        filter_index += 1

    # MaxPrice filter
    if "maxValue" in args:
        params[f"itemFilter({filter_index}).name"] = "MaxPrice"
        params[f"itemFilter({filter_index}).value"] = args["maxValue"]
        params[f"itemFilter({filter_index}).paramName"] = "Currency"
        params[f"itemFilter({filter_index}).paramValue"] = "USD"
        filter_index += 1

    # Condition filter
    if "conditions" in args:
        conditions = args["conditions"].split(",")
        params[f"itemFilter({filter_index}).name"] = "Condition"
        for idx, condition in enumerate(conditions):
            params[f"itemFilter({filter_index}).value({idx})"] = condition  # Map to the correct eBay value if necessary
        filter_index += 1

    # ReturnsAcceptedOnly filter
    if "seller" in args and "ReturnsAccepted" in args["seller"]:
        params[f"itemFilter({filter_index}).name"] = "ReturnsAcceptedOnly"
        params[f"itemFilter({filter_index}).value"] = True
        filter_index += 1

    # FreeShippingOnly filter
    if "shipping" in args and "FreeShipping" in args["shipping"]:
        params[f"itemFilter({filter_index}).name"] = "FreeShippingOnly"
        params[f"itemFilter({filter_index}).value"] = "true"
        filter_index += 1

    # ExpeditedShippingType filter
    if "shipping" in args and "Expedited" in args["shipping"]:
        params[f"itemFilter({filter_index}).name"] = "ExpeditedShippingType"
        params[f"itemFilter({filter_index}).value"] = "Expedited"
        filter_index += 1

    print(params)

    response = requests.get(base_url, params=params)
    data = response.json()

    return data

@app.route('/singledata', methods=['GET'])
def get_single_data():
    args = request.args.to_dict()
    base_url = "https://open.api.ebay.com/shopping"
    params = {
        "callname": "GetSingleItem",
        "responseencoding": "JSON",
        "appid": "BhavenGo-Assign2-PRD-e7284ce84-24b40984",
        "siteid": "0",
        "version": "967",
        "ItemID": args["id"],
        "IncludeSelector": "Description,Details,ItemSpecifics"
    }
    headers = {
        "X-EBAY-API-IAF-TOKEN": oauth_utility.getApplicationToken()
    }
    response = requests.get(base_url, params=params, headers=headers)
    # response = requests.get(base_url, params=params)
    data = response.json()
    return data


if __name__ == '__main__':
   app.run(debug = True)