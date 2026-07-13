# Important Failure

Earlier recovery designs lost the next action when compact output was incomplete. The current design
must restore from a validated Recovery Pack and only replay the required Journal delta.
