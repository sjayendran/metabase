import React from "react";
import Autosuggest from "react-autosuggest";
/*This component allows for dashboards to be dynamically searched
using an auto suggest / auto complete UI component;
Clicking a suggestion directly navigates the user to the selected
dashboard.*/

export default class DynamicSearch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      suggestions: [],
      rawItemList: [],
      cardList: [],
      dashboardList: [],
      value: "",
    };
  }

  getSuggestions = value => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;
    const regex = new RegExp(`^${inputValue}`, "i");

    return inputLength === 0
      ? []
      : this.state.rawItemList.sort().filter(v => regex.test(v.name));
  };

  renderSuggestion = suggestion => <div>{suggestion.name}{this.state.cardList.includes(suggestion) ? ' [Question / Card]' : ' [Dashboard]'}</div>;

  onTextChanged = (event, { newValue }) => {
    this.setState({
      value: newValue,
    });
  };

  // clickDashboardSuggestion = e => {
  //   console.log("$@$@$@ clicked this value");
  //   console.log(e);
  //   window.location = "/dashboard/" + e.target.value;
  // };

  getMetabaseSessionKey() {
    let match = document.cookie.match(
      new RegExp("(^| )metabase.SESSION_ID=([^;]+)"),
    );
    if (match) {
      return match[2];
    }
  }

  getCardList(self){
    fetch("http://" + window.location.hostname + ":3000/api/card", {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        "X-Metabase-Session": this.getMetabaseSessionKey(),
      },
      redirect: "follow",
      referrer: "no-referrer",
    })
      .then(function(response) {
        if (!response.ok) {
          throw response;
        }
        return response.json();
      })
      .then(function(data) {
        console.log("$#$##$#$ this is the data got back from the cards api:");
        console.log(data);
        let filterSearchableCards = data.filter(item => item.description !== null && item.description.toLowerCase().includes("searchable"));
        //let filterSearchableCards = data.filter(item => item.description.toLowerCase().indexOf('searchable') >= 0);
        self.setState({
          cardList: filterSearchableCards
        },() => {
          console.log("GOING TO TRY AND CALL the dshboard api now!");
          self.getDashboardList(self);
        });
        //self.getDashboardList(self);
      })
      .catch(err => {
        console.log("Encountered an error while trying to load homepage ");
        let errObj = JSON.parse(err);
        console.log(errObj);
      });
  }

  getDashboardList(self){
    console.log("GOINGGOKNG to get DASHBOARD LIST NOW!!!!");
    fetch("http://" + window.location.hostname + ":3000/api/dashboard", {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        "X-Metabase-Session": this.getMetabaseSessionKey(),
      },
      redirect: "follow",
      referrer: "no-referrer",
    })
      .then(function(response) {
        if (!response.ok) {
          throw response;
        }
        return response.json();
      })
      .then(function(data) {
        console.log("$#$##$#$ this is the data got back from the dashboard api:");
        console.log(data);
        self.setState({
          rawItemList: self.state.cardList.concat(data),
          dashboardList: data
        },() => {
          console.log("FINISHED getting card and dashboard dataaa!!!");
          console.log(self.state.rawItemList)
        });
      })
      .catch(err => {
        console.log("Encountered an error while trying to load homepage ");
        let errObj = JSON.parse(err);
        console.log(errObj);
      });
  }

  componentDidMount() {
    this.getCardList(this);
  }

  onSuggestionsFetchRequested = ({ value }) => {
    this.setState({
      suggestions: this.getSuggestions(value),
    });
  };

  // Autosuggest will call this function every time you need to clear suggestions.
  onSuggestionsClearRequested = () => {
    this.setState({
      suggestions: [],
    });
  };

  onSuggestionSelected = (
    event,
    { suggestion, suggestionValue, suggestionIndex, sectionIndex, method },
  ) => {
    console.log("$@$@$@ clicked this value");
    console.log(suggestion);
    let suggestionTypeSlug = this.state.cardList.includes(suggestion) ? '/card/' : '/dashboard/';
    window.location = suggestionTypeSlug + suggestion.id;
  };

  render() {
    const getSuggestionValue = suggestion => suggestion.name;

    const { value, suggestions } = this.state;

    const inputProps = {
      placeholder: "Search for a dashboard or question...",
      value,
      onChange: this.onTextChanged,
    };

    return (
      <Autosuggest
        suggestions={suggestions}
        onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
        onSuggestionsClearRequested={this.onSuggestionsClearRequested}
        onSuggestionSelected={this.onSuggestionSelected}
        getSuggestionValue={getSuggestionValue}
        renderSuggestion={this.renderSuggestion}
        inputProps={inputProps}
      />
    );
  }
}
