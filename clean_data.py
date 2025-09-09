import pandas as pd

# Load the dataset
df = pd.read_csv('nba25per36.csv')

# Identify players with multiple rows.
# We use value_counts() to count occurrences of each player's name.
player_counts = df['Player'].value_counts()
# We select the names of players that appear more than once.
duplicated_players = player_counts[player_counts > 1].index

# Separate the DataFrame.
# df_unique_players contains players who appear only once.
df_unique_players = df[~df['Player'].isin(duplicated_players)]
# df_duplicated_players contains all rows for players who appear more than once.
df_duplicated_players = df[df['Player'].isin(duplicated_players)]

# For players with multiple rows, we only keep the one where the 'Team' column is '2TM'.
# This row typically represents the player's total stats for the season if they played for multiple teams.
df_2tm_rows = df_duplicated_players[df_duplicated_players['Team'] == '2TM']

# Combine the two DataFrames to get our final, cleaned dataset.
# We concatenate the DataFrame of unique players with the '2TM' rows of duplicated players.
df_cleaned = pd.concat([df_unique_players, df_2tm_rows])

# Sort by player name
df_cleaned = df_cleaned.sort_values('Player').reset_index(drop=True)

# Display the first few rows of the cleaned dataset
print("Cleaned NBA Players DataFrame:")
print(df_cleaned.head())

# You can also check the shape of the original vs cleaned dataframe
print(f"\nOriginal DataFrame shape: {df.shape}")
print(f"Cleaned DataFrame shape: {df_cleaned.shape}")
