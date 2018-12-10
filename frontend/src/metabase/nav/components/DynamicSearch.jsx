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

  renderSuggestion = suggestion => <div>{suggestion.name}</div>;

  onTextChanged = (event, { newValue }) => {
    this.setState({
      value: newValue,
    });
  };

  clickDashboardSuggestion = e => {
    window.location = "/dashboard/" + e.target.value;
  };

  getMetabaseSessionKey() {
    let match = document.cookie.match(
      new RegExp("(^| )metabase.SESSION_ID=([^;]+)"),
    );
    if (match) {
      return match[2];
    }
  }

  componentDidMount() {
    let self = this;
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
        self.setState(() => ({
          rawItemList: data,
        }));
      })
      .catch(err => {
        console.log("Encountered an error while trying to load homepage ");
        let errObj = JSON.parse(err);
        console.log(errObj);
      });
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
    window.location = "/dashboard/" + suggestion.id;
  };

  render() {
    const getSuggestionValue = suggestion => suggestion.name;

    const { value, suggestions } = this.state;

    const inputProps = {
      placeholder: "Search for a dashboard...",
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
