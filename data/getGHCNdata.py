# coding: utf-8
import pandas as pd
import numpy as np


def ghcn_daily_to_df(station_id):
    """
    :param station_id: Weather Station ID - see ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/ghcnd-stations.txt for full list
    :return: pandas dataframe with these variables:
                    TMAX: Daily maximum temperature (deg F)
                    TMIN: Daily minimum temperature for the day
                    PRCP: Daily precipitation (inches)
                    RHIGH: Record maximum temperature for that day of the year
                    RLOW: Record minimum temperature for that day of the year
                    NHIGH: Mean maximum temperature for that day of the year
                    NLOW: Mean minimum temperature for that day of the year
                    CUMPRCP: Cumulative precipitation by month
                    MONTHPRCP: Total precipitation for the month (ie the final value for the month from CUMPRCP)
                    MEANPRCP: Average precipitation for the month (over all years)



    Data is obtained from NOAA's FTP data server: ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/all
    It comes in a fixed-width text file ('.dly') with the following specs:
    ------------------------------
    Variable   Columns   Type
    ------------------------------
    ID            1-11   Character
    YEAR         12-15   Integer
    MONTH        16-17   Integer
    ELEMENT      18-21   Character
    VALUE1       22-26   Integer
    MFLAG1       27-27   Character
    QFLAG1       28-28   Character
    SFLAG1       29-29   Character
    VALUE2       30-34   Integer
    MFLAG2       35-35   Character
    QFLAG2       36-36   Character
    SFLAG2       37-37   Character
      .           .          .
      .           .          .
      .           .          .
    VALUE31    262-266   Integer
    MFLAG31    267-267   Character
    QFLAG31    268-268   Character
    SFLAG31    269-269   Character
    ------------------------------

    See ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/readme.txt for full details on the data specs

    In the .dly file, each row represents one variable observed over the course of one month
    Columns represent daily observations of that variable within the month, along with various data quality flags

    To turn this into a usable format, we first convert into a 3FN dataset keyed by date, then we calculate the
    record high/low temperatures, mean high/low temperatures, cumulative precipitation and avg monthly precipitation

    We also convert from 10ths of a degree C and 10ths of a mm into degrees F and inches.

    """

    # First we need to create headers and column-width specifiers to match the data specs shown in the docstring above
    keys = ['ID', 'YEAR', 'MONTH', 'ELEMENT']
    heads = keys + [i+str(x) for x in range(1, 32) for i in ['VALUE', 'MFLAG', 'QFLAG', 'SFLAG']]
    specs = [(0, 11), (11, 15), (15, 17), (17, 21)]
    for i in range(21, 269, 8):
        specs.append((i, i+5))
        specs.append((i+5, i+6))
        specs.append((i+6, i+7))
        specs.append((i+7, i+8))

    # We aren't going to use the data flag columns, so we create an array of their names to be able to drop them
    drop_cols = [i+str(x) for x in range(1, 32) for i in ['MFLAG', 'QFLAG', 'SFLAG']]

    # Read in the data from the FTP server for the selected weather station
    url = 'ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/all/%s.dly' % station_id
    df = pd.read_fwf(url, colspecs=specs, names=heads, index_col=keys)

    # Drop the data flag columns, treat values of -9999 as missing
    # Change the value column names to just the integer for the day of the month they record data for
    df.drop(drop_cols, axis=1, inplace=True)
    df.replace(-9999, np.nan, inplace=True)
    df.columns = range(1, 32)

    # Use the stack() and pivot() capabilities of pandas to create a 3FN dataset, keyed on date
    # Drop any variables other than TMAX, TMIN and PRCP
    # Unlike true 3FN, the date key will remain a composite index, split into Year, Month and Day columns
    df = pd.DataFrame(df.stack())
    df.reset_index(inplace=True)
    df.columns = keys+['DAY', 'VALUE']
    df = df[df['ELEMENT'].isin(['TMAX', 'TMIN', 'PRCP'])]
    df = df.pivot_table(index=['ID', 'YEAR', 'MONTH', 'DAY'], columns='ELEMENT', values='VALUE').reset_index()

    df['PRCP'].fillna(0, inplace=True)  # if precipitation is missing, fill with 0


    # Combine Year, Month and Day into a date field
    df['DATE'] = pd.to_datetime(df['YEAR']*10000+df['MONTH']*100+df['DAY'], format='%Y%m%d')

    # reindex, padding with forward fill to make sure we fill all gaps
    # ie 1938 is missing some days, and a few others, and the gaps will cause problems for our visualization
    df.index = df['DATE']
    idx = pd.date_range(df.index[0],df.index[-1])
    df = df.reindex(idx, method='ffill')
    df['MONTH'] = df.index.month
    df['DAY'] = df.index.day
    df['DATE'] = df.index

    df = df[df['YEAR'] < 2015]  # include only years before 2015 in the calculations and dataset

    # Units conversion
    df['PRCP'] *= 0.00393701  # Convert precipitation from 10ths of a mm to inches
    df['TMAX'] = df['TMAX'] * (9.0/50) + 32  # Convert from 10ths of a degree C to degrees F
    df['TMIN'] = df['TMIN'] * (9.0/50) + 32  # Convert from 10ths of a degree C to degrees F

    # Calculate record highs and lows, average highs and lows, and cumulative and average monthly precipitation
    df['RHIGH'] = df.groupby(by=['MONTH', 'DAY']).transform(np.max)['TMAX']
    df['NHIGH'] = df.groupby(by=['MONTH', 'DAY']).transform(np.mean)['TMAX']
    df['RLOW'] = df.groupby(by=['MONTH', 'DAY']).transform(np.min)['TMIN']
    df['NLOW'] = df.groupby(by=['MONTH', 'DAY']).transform(np.mean)['TMIN']

    # Data cleaning - If max is higher than min, swap the values around
    df['TEMP_MAX'] = df['TMAX']
    df.loc[df['TEMP_MAX'] < df['TMIN'], 'TMAX'] = df.loc[df['TEMP_MAX'] < df['TMIN'], 'TMIN']
    df.loc[df['TEMP_MAX'] < df['TMIN'], 'TMIN'] = df.loc[df['TEMP_MAX'] < df['TMIN'], 'TEMP_MAX']

    df['TMAX'].fillna(df['NHIGH'], inplace=True)  # If max or min are missing, fill with the average high/low
    df['TMIN'].fillna(df.loc[:, ['NLOW', 'TMAX']].min(axis=1), inplace=True)  # Or the Max if the average low is higher

    #Precipitation calcs:
    df['CUMPRCP'] = df.groupby(by=['YEAR', 'MONTH']).cumsum()['PRCP']
    df['MONTHPRCP'] = df.groupby(by=['YEAR', 'MONTH']).transform(max)['CUMPRCP']
    df['MEANPRCP'] = df.groupby(by=['MONTH']).transform(np.mean)['MONTHPRCP']
    df['MAXCUMPRCP'] = np.max(df['CUMPRCP'])



    # Make all column headers lower case
    df.columns = [str(x).lower() for x in df.columns]

    return df


if __name__ == '__main__':
    # USW00094728 is the New York Central Park Belvedere Castle National Weather Service Observatory
    data = ghcn_daily_to_df('USW00094728')
    data.to_csv('NYCWeather.csv')