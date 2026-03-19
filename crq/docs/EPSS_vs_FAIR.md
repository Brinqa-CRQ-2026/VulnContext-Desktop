# EPSS vs FAIR
## EPSS
EPSS is a data-driven model that estimates the probability a vulnerability will be exploited in the wild — typically over the next 30 days — by analyzing historical exploit activity and vulnerability characteristics. It produces a probability score.

* EPSS estimates likelihodd of exploitation, not risk magnitude or frequency of attempts

* It is designed for vulnerability prioritization, not direct financial risk scoring

* EPSS does not account for an individual organization's context — such as exposure, mitigation controls, or asset value

## FAIR
Fair defines core concepts such as Threat Event Frequency, Vulnerability, and Loss Event Frequency

* Threat Event Frequency (TEF): The probable frequency, within a given timeframe, that a threat agent will act against an asset.

* Vulnerability (in FAIR): The fraction of Threat Events that become Loss Events.

* Loss Event Frequency (LEF): It explicitly states that LEF derives from TEF and Vulnerability:\
\
$\boxed{\text{Loss Event} = \text{Threat Event Frequency } * \text{ Vulnerability}}$